import os
import logging
from typing import Optional

from services.circuit_breaker import CircuitBreaker, CircuitBreakerError
from services.cache import azure_api_cache, make_cache_key

logger = logging.getLogger(__name__)

# Circuit breaker: open after 3 failures, retry after 60 seconds
_azure_breaker = CircuitBreaker(
    service_name="azure-cognitive-services",
    failure_threshold=3,
    recovery_timeout=60.0,
    success_threshold=2,
)


class AzureModelClient:
    """Optional live Azure integration with circuit breaker and caching."""

    def __init__(self):
        self._client = None
        self._subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID")

    def _get_client(self):
        if self._client is None:
            try:
                from azure.identity import DefaultAzureCredential
                from azure.mgmt.cognitiveservices import CognitiveServicesManagementClient

                credential = DefaultAzureCredential()
                self._client = CognitiveServicesManagementClient(
                    credential, self._subscription_id
                )
            except Exception as e:
                logger.warning(f"Azure client initialization failed: {e}")
                return None
        return self._client

    @property
    def is_available(self) -> bool:
        return self._subscription_id is not None and self._get_client() is not None

    @property
    def circuit_breaker(self) -> CircuitBreaker:
        return _azure_breaker

    def list_deployments(self, resource_group: Optional[str] = None) -> list:
        """List Azure deployments with circuit breaker and caching."""
        cache_key = make_cache_key("deployments", resource_group)
        cached = azure_api_cache.get(cache_key)
        if cached is not None:
            return cached

        client = self._get_client()
        if not client:
            return []

        try:
            deployments = _azure_breaker.call(
                self._fetch_deployments, client, resource_group
            )
            azure_api_cache.set(cache_key, deployments)
            return deployments
        except CircuitBreakerError as e:
            logger.warning(f"Circuit breaker open: {e}")
            return []
        except Exception as e:
            logger.error(f"Failed to list deployments: {e}")
            return []

    def _fetch_deployments(self, client, resource_group: Optional[str]) -> list:
        """Internal method that performs the actual Azure API call."""
        deployments = []
        accounts = client.accounts.list()
        for account in accounts:
            if resource_group and account.id and resource_group not in account.id:
                continue
            rg = account.id.split("/resourceGroups/")[1].split("/")[0]
            try:
                account_deployments = client.deployments.list(
                    resource_group_name=rg,
                    account_name=account.name,
                )
                for dep in account_deployments:
                    deployments.append({
                        "name": dep.name,
                        "model_name": dep.properties.model.name if dep.properties.model else "unknown",
                        "model_version": dep.properties.model.version if dep.properties.model else "unknown",
                        "account": account.name,
                        "region": account.location,
                        "resource_group": rg,
                        "provisioning_state": dep.properties.provisioning_state,
                    })
            except Exception as e:
                logger.warning(f"Failed to list deployments for {account.name}: {e}")
        return deployments

    def check_model_availability(self, model_name: str, region: str) -> dict:
        """Check model availability with circuit breaker and caching."""
        cache_key = make_cache_key("availability", model_name, region)
        cached = azure_api_cache.get(cache_key)
        if cached is not None:
            return cached

        client = self._get_client()
        if not client:
            return {"available": False, "reason": "Azure client not configured"}

        try:
            result = _azure_breaker.call(
                self._fetch_availability, client, model_name, region
            )
            azure_api_cache.set(cache_key, result)
            return result
        except CircuitBreakerError as e:
            return {
                "available": False,
                "reason": f"Service temporarily unavailable (retry in {e.time_until_retry:.0f}s)",
                "circuit_breaker": "open",
            }
        except Exception as e:
            return {"available": False, "reason": str(e)}

    def _fetch_availability(self, client, model_name: str, region: str) -> dict:
        """Internal method that performs the actual Azure API call."""
        models = client.models.list(location=region)
        for model in models:
            if model_name.lower() in model.name.lower():
                return {
                    "available": True,
                    "model_name": model.name,
                    "region": region,
                    "versions": [v.name for v in (model.model.skus or [])],
                }
        return {"available": False, "reason": f"Model '{model_name}' not found in region '{region}'"}


azure_client = AzureModelClient()
