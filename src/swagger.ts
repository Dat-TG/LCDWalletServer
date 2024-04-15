import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    version: "v1.0.0",
    title: "LCDWallet API Documentation",
    description: "Documentation for the LCDWallet API",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  components: {
    schemas: {
      PasswordRequest: {
        password: "string",
      },
      WalletResponseSuccess: {
        message: "string",
        downloadUrl: "string",
      },
      WalletResponseError: {
        error: "string",
      },
    },
  },
};

const outputFile = "./swagger_output.json";
const endpointsFiles = ["./src/index.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);
