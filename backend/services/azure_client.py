import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AzureModelClient:
    """Optional live Azure integration to list deployed models and validate availability."""

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

    def list_deployments(self, resource_group: Optional[str] = None) -> list:
        client = self._get_client()
        if not client:
            return []

        deployments = []
        try:
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
        except Exception as e:
            logger.error(f"Failed to list Azure accounts: {e}")

        return deployments

    def check_model_availability(self, model_name: str, region: str) -> dict:
        client = self._get_client()
        if not client:
            return {"available": False, "reason": "Azure client not configured"}

        try:
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
        except Exception as e:
            return {"available": False, "reason": str(e)}


azure_client = AzureModelClient()
