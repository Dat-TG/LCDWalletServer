import express, { NextFunction } from "express";

const loggerMiddleware = async (
  request: express.Request,
  response: express.Response,
  next: NextFunction
) => {
  console.log("-------------------------");
  console.log(`${request.method} ${request.path}`);
  console.log(`Request body: ${JSON.stringify(request.body)}`);
  console.log(`Request query: ${JSON.stringify(request.query)}`);
  console.log(`Request params: ${JSON.stringify(request.params)}`);
  console.log(`Request headers: ${JSON.stringify(request.headers)}`);
  console.log(`Request cookies: ${JSON.stringify(request.cookies)}`);
  console.log(`Request ip: ${request.ip}`);
  next();
};

export default loggerMiddleware;
