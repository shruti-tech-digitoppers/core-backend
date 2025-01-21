import express from "express";

class AuthController {
  constructor() {
    this.router = express.Router();
  }

  activateLicense = (req, res) => {
    res.send("Hello World");
  };
}

export default AuthController;