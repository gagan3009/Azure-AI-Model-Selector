import { useState, useEffect } from 'react'
import { getModels } from '../services/api'

const CODE_TEMPLATES = {
  python: {
    label: 'Python',
    chat: (model) => `from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://YOUR_RESOURCE.openai.azure.com/",
    api_key="YOUR_API_KEY",
    api_version="2024-02-01"
)

response = client.chat.completions.create(
    model="${model.id}",  # ${model.name}
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, how can you help me?"}
    ],
    temperature=0.7,
    max_tokens=800,
    top_p=0.95,
)

print(response.choices[0].message.content)`,
    embedding: (model) => `from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://YOUR_RESOURCE.openai.azure.com/",
    api_key="YOUR_API_KEY",
    api_version="2024-02-01"
)

response = client.embeddings.create(
    model="${model.id}",  # ${model.name}
    input="Your text to embed here"
)

embedding_vector = response.data[0].embedding
print(f"Embedding dimension: {len(embedding_vector)}")`,
    vision: (model) => `from azure.ai.vision import VisionClient
from azure.core.credentials import AzureKeyCredential

client = VisionClient(
    endpoint="https://YOUR_RESOURCE.cognitiveservices.azure.com/",
    credential=AzureKeyCredential("YOUR_API_KEY")
)

# Analyze image
result = client.analyze(
    image_url="https://example.com/image.jpg",
    visual_features=["Caption", "Tags", "Objects"]
)

print(f"Caption: {result.caption.text}")
for tag in result.tags:
    print(f"  Tag: {tag.name} ({tag.confidence:.2%})")`,
    speech: (model) => `import azure.cognitiveservices.speech as speechsdk

speech_config = speechsdk.SpeechConfig(
    subscription="YOUR_API_KEY",
    region="eastus"
)

# Speech-to-text
audio_config = speechsdk.AudioConfig(filename="audio.wav")
recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    audio_config=audio_config
)

result = recognizer.recognize_once()
print(f"Recognized: {result.text}")`,
    document: (model) => `from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

client = DocumentIntelligenceClient(
    endpoint="https://YOUR_RESOURCE.cognitiveservices.azure.com/",
    credential=AzureKeyCredential("YOUR_API_KEY")
)

with open("invoice.pdf", "rb") as f:
    poller = client.begin_analyze_document(
        "prebuilt-invoice",
        body=f,
        content_type="application/pdf"
    )

result = poller.result()
for doc in result.documents:
    print(f"Vendor: {doc.fields.get('VendorName', {}).get('content')}")
    print(f"Total: {doc.fields.get('InvoiceTotal', {}).get('content')}")`,
    translation: (model) => `import requests

endpoint = "https://api.cognitive.microsofttranslator.com"
path = "/translate?api-version=3.0&to=fr&to=es"

headers = {
    "Ocp-Apim-Subscription-Key": "YOUR_API_KEY",
    "Ocp-Apim-Subscription-Region": "eastus",
    "Content-Type": "application/json"
}

body = [{"text": "Hello, how are you?"}]
response = requests.post(endpoint + path, headers=headers, json=body)

for translation in response.json()[0]["translations"]:
    print(f"{translation['to']}: {translation['text']}")`,
    image: (model) => `from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://YOUR_RESOURCE.openai.azure.com/",
    api_key="YOUR_API_KEY",
    api_version="2024-02-01"
)

result = client.images.generate(
    model="${model.id}",  # ${model.name}
    prompt="A futuristic city with flying cars at sunset",
    size="1024x1024",
    quality="hd",
    n=1
)

print(result.data[0].url)`,
    code: (model) => `from openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://YOUR_RESOURCE.openai.azure.com/",
    api_key="YOUR_API_KEY",
    api_version="2024-02-01"
)

response = client.chat.completions.create(
    model="${model.id}",  # ${model.name}
    messages=[
        {"role": "system", "content": "You are an expert programmer. Write clean, efficient code."},
        {"role": "user", "content": "Write a Python function to merge two sorted arrays."}
    ],
    temperature=0.2,
    max_tokens=2000,
)

print(response.choices[0].message.content)`,
  },
  javascript: {
    label: 'JavaScript',
    chat: (model) => `import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint: "https://YOUR_RESOURCE.openai.azure.com/",
  apiKey: "YOUR_API_KEY",
  apiVersion: "2024-02-01",
});

const response = await client.chat.completions.create({
  model: "${model.id}",  // ${model.name}
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, how can you help me?" }
  ],
  temperature: 0.7,
  max_tokens: 800,
});

console.log(response.choices[0].message.content);`,
    embedding: (model) => `import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint: "https://YOUR_RESOURCE.openai.azure.com/",
  apiKey: "YOUR_API_KEY",
  apiVersion: "2024-02-01",
});

const response = await client.embeddings.create({
  model: "${model.id}",  // ${model.name}
  input: "Your text to embed here",
});

const embedding = response.data[0].embedding;
console.log(\`Embedding dimension: \${embedding.length}\`);`,
    vision: (model) => `import { ComputerVisionClient } from "@azure/cognitiveservices-computervision";
import { ApiKeyCredentials } from "@azure/ms-rest-js";

const client = new ComputerVisionClient(
  new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": "YOUR_KEY" } }),
  "https://YOUR_RESOURCE.cognitiveservices.azure.com/"
);

const result = await client.analyzeImage("https://example.com/image.jpg", {
  visualFeatures: ["Categories", "Description", "Tags"],
});

console.log("Description:", result.description.captions[0].text);
result.tags.forEach(tag => console.log(\`  Tag: \${tag.name} (\${tag.confidence})\`));`,
    speech: (model) => `import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const speechConfig = sdk.SpeechConfig.fromSubscription("YOUR_KEY", "eastus");
const audioConfig = sdk.AudioConfig.fromWavFileInput("audio.wav");

const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

recognizer.recognizeOnceAsync(result => {
  console.log("Recognized:", result.text);
  recognizer.close();
});`,
    document: (model) => `import DocumentIntelligence from "@azure-rest/ai-document-intelligence";

const client = DocumentIntelligence("https://YOUR_RESOURCE.cognitiveservices.azure.com/", {
  key: "YOUR_API_KEY",
});

const poller = await client.path("/documentModels/{modelId}:analyze", "prebuilt-invoice")
  .post({ body: fileBuffer, contentType: "application/pdf" });

const result = await poller.pollUntilDone();
for (const doc of result.body.analyzeResult.documents) {
  console.log("Vendor:", doc.fields.VendorName?.content);
  console.log("Total:", doc.fields.InvoiceTotal?.content);
}`,
    translation: (model) => `const endpoint = "https://api.cognitive.microsofttranslator.com";
const apiKey = "YOUR_API_KEY";

const response = await fetch(
  \`\${endpoint}/translate?api-version=3.0&to=fr&to=es\`,
  {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Ocp-Apim-Subscription-Region": "eastus",
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ text: "Hello, how are you?" }]),
  }
);

const data = await response.json();
data[0].translations.forEach(t => console.log(\`\${t.to}: \${t.text}\`));`,
    image: (model) => `import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint: "https://YOUR_RESOURCE.openai.azure.com/",
  apiKey: "YOUR_API_KEY",
  apiVersion: "2024-02-01",
});

const result = await client.images.generate({
  model: "${model.id}",  // ${model.name}
  prompt: "A futuristic city with flying cars at sunset",
  size: "1024x1024",
  quality: "hd",
  n: 1,
});

console.log(result.data[0].url);`,
    code: (model) => `import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  endpoint: "https://YOUR_RESOURCE.openai.azure.com/",
  apiKey: "YOUR_API_KEY",
  apiVersion: "2024-02-01",
});

const response = await client.chat.completions.create({
  model: "${model.id}",  // ${model.name}
  messages: [
    { role: "system", content: "You are an expert programmer. Write clean, efficient code." },
    { role: "user", content: "Write a function to merge two sorted arrays." }
  ],
  temperature: 0.2,
  max_tokens: 2000,
});

console.log(response.choices[0].message.content);`,
  },
  csharp: {
    label: 'C#',
    chat: (model) => `using Azure.AI.OpenAI;
using Azure;

var client = new AzureOpenAIClient(
    new Uri("https://YOUR_RESOURCE.openai.azure.com/"),
    new AzureKeyCredential("YOUR_API_KEY")
);

var chatClient = client.GetChatClient("${model.id}");

var response = await chatClient.CompleteChatAsync(new[]
{
    new SystemChatMessage("You are a helpful assistant."),
    new UserChatMessage("Hello, how can you help me?")
});

Console.WriteLine(response.Value.Content[0].Text);`,
    embedding: (model) => `using Azure.AI.OpenAI;
using Azure;

var client = new AzureOpenAIClient(
    new Uri("https://YOUR_RESOURCE.openai.azure.com/"),
    new AzureKeyCredential("YOUR_API_KEY")
);

var embeddingClient = client.GetEmbeddingClient("${model.id}");
var result = await embeddingClient.GenerateEmbeddingAsync("Your text to embed");

Console.WriteLine($"Embedding dimension: {result.Value.Vector.Length}");`,
    vision: (model) => `using Azure.AI.Vision.ImageAnalysis;
using Azure;

var client = new ImageAnalysisClient(
    new Uri("https://YOUR_RESOURCE.cognitiveservices.azure.com/"),
    new AzureKeyCredential("YOUR_API_KEY")
);

var result = await client.AnalyzeAsync(
    new Uri("https://example.com/image.jpg"),
    VisualFeatures.Caption | VisualFeatures.Tags
);

Console.WriteLine($"Caption: {result.Value.Caption.Text}");
foreach (var tag in result.Value.Tags.Values)
    Console.WriteLine($"  Tag: {tag.Name} ({tag.Confidence:P})");`,
    speech: (model) => `using Microsoft.CognitiveServices.Speech;

var speechConfig = SpeechConfig.FromSubscription("YOUR_KEY", "eastus");
using var audioConfig = AudioConfig.FromWavFileInput("audio.wav");
using var recognizer = new SpeechRecognizer(speechConfig, audioConfig);

var result = await recognizer.RecognizeOnceAsync();
Console.WriteLine($"Recognized: {result.Text}");`,
    document: (model) => `using Azure.AI.DocumentIntelligence;
using Azure;

var client = new DocumentIntelligenceClient(
    new Uri("https://YOUR_RESOURCE.cognitiveservices.azure.com/"),
    new AzureKeyCredential("YOUR_API_KEY")
);

using var stream = File.OpenRead("invoice.pdf");
var operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed,
    "prebuilt-invoice",
    stream
);

var result = operation.Value;
foreach (var doc in result.Documents)
{
    Console.WriteLine($"Vendor: {doc.Fields["VendorName"].Content}");
    Console.WriteLine($"Total: {doc.Fields["InvoiceTotal"].Content}");
}`,
    translation: (model) => `using Azure.AI.Translation.Text;
using Azure;

var client = new TextTranslationClient(
    new AzureKeyCredential("YOUR_API_KEY"),
    "eastus"
);

var response = await client.TranslateAsync(
    targetLanguages: new[] { "fr", "es" },
    content: new[] { "Hello, how are you?" }
);

foreach (var translation in response.Value[0].Translations)
    Console.WriteLine($"{translation.TargetLanguage}: {translation.Text}");`,
    image: (model) => `using Azure.AI.OpenAI;
using Azure;

var client = new AzureOpenAIClient(
    new Uri("https://YOUR_RESOURCE.openai.azure.com/"),
    new AzureKeyCredential("YOUR_API_KEY")
);

var imageClient = client.GetImageClient("${model.id}");
var result = await imageClient.GenerateImageAsync(
    "A futuristic city with flying cars at sunset",
    new ImageGenerationOptions { Size = GeneratedImageSize.W1024xH1024 }
);

Console.WriteLine(result.Value.ImageUri);`,
    code: (model) => `using Azure.AI.OpenAI;
using Azure;

var client = new AzureOpenAIClient(
    new Uri("https://YOUR_RESOURCE.openai.azure.com/"),
    new AzureKeyCredential("YOUR_API_KEY")
);

var chatClient = client.GetChatClient("${model.id}");

var response = await chatClient.CompleteChatAsync(new[]
{
    new SystemChatMessage("You are an expert programmer."),
    new UserChatMessage("Write a C# method to merge two sorted arrays.")
});

Console.WriteLine(response.Value.Content[0].Text);`,
  },
}

function CodeSnippetGenerator() {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [language, setLanguage] = useState('python')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getModels().then(data => {
      const allModels = data.models || []
      setModels(allModels)
      if (allModels.length > 0) setSelectedModel(allModels[0])
    }).catch(console.error)
  }, [])

  const getSnippet = () => {
    if (!selectedModel) return '// Select a model to see code snippets'
    const category = selectedModel.category
    const langTemplates = CODE_TEMPLATES[language]
    if (!langTemplates) return '// Language not supported'
    const templateFn = langTemplates[category] || langTemplates.chat
    return templateFn(selectedModel)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getSnippet())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-snippet-container">
      <div className="code-snippet-sidebar">
        <h2 className="card-title">Configuration</h2>

        <div className="form-group">
          <label>Select Model</label>
          <select
            value={selectedModel?.id || ''}
            onChange={e => setSelectedModel(models.find(m => m.id === e.target.value))}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
            ))}
          </select>
        </div>

        {selectedModel && (
          <div style={{ marginTop: 16 }}>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Provider</span>
                <span className="detail-value">{selectedModel.provider}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{selectedModel.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Pricing</span>
                <span className="detail-value">{selectedModel.pricing_tier}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Regions</span>
                <span className="detail-value">{selectedModel.supported_regions.length}</span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="tags">
                {selectedModel.capabilities.map(cap => (
                  <span key={cap} className="tag capability">{cap}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="code-snippet-main">
        <h2 className="card-title">SDK Code Snippet</h2>

        <div className="lang-tabs">
          {Object.entries(CODE_TEMPLATES).map(([key, val]) => (
            <button
              key={key}
              className={`lang-tab ${language === key ? 'active' : ''}`}
              onClick={() => setLanguage(key)}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div className="code-block">
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
          <pre>{getSnippet()}</pre>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <strong>Note:</strong> Replace <code>YOUR_RESOURCE</code>, <code>YOUR_API_KEY</code> with your Azure resource details. 
          Use environment variables or Azure Key Vault in production — never hardcode secrets.
        </div>
      </div>
    </div>
  )
}

export default CodeSnippetGenerator
