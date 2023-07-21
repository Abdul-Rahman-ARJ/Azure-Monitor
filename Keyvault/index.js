const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

module.exports = async function (context, req) {
  // Get the managed identity credential
  const credential = new DefaultAzureCredential();

  // Create a secret client
  const vaultName = "api01keyvault";
  const vaultUrl = `https://${vaultName}.vault.azure.net/`;
  const secretClient = new SecretClient(vaultUrl, credential);

  // Access a secret
  const secretName = "AES-KEY";
  const secret = await secretClient.getSecret(secretName);

  // Use the secret value in your function app
  const secretValue = secret.value;
  context.log(secretValue); // or do something else with the secret

  context.res = {
    body: "Secret retrieved successfully.",
  };
};
