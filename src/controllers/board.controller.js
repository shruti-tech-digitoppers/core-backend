import { Board } from "../models/model.mongo.js";
import { ERROR_CODES } from "../constants/error.constants.js";

export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find();
    res.json({ data: boards });
  } catch (error) {
    res.status(500).json({ message: "Error fetching boards", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    res.json({ data: board });
  } catch (error) {
    res.status(500).json({ message: "Error fetching board", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createBoard = async (req, res) => {
  const board = new Board(req.body);
  try {
    await board.save();
    res.json({ message: "Board created" });
  } catch (error) {
    res.status(500).json({ message: "Error creating board", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const createBoardInBulk = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: "Boards data is required", errorCode: ERROR_CODES.BAD_REQUEST });
  }

  const boards = req.body;
  try {
    await Board.insertMany(boards);
    res.json({ message: "Boards created" });
  } catch (error) {
    res.status(500).json({ message: error.message, errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const updateBoard = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: "Board ID is required", errorCode: ERROR_CODES.BAD_REQUEST });
  }

  if (!req.body) {
    return res.status(400).json({ message: "Board data is required", errorCode: ERROR_CODES.BAD_REQUEST });
  }

  try {
    const board = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: "Board updated", data: board });
  } catch (error) {
    res.status(500).json({ message: "Error updating board", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const deleteBoard = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: "Board ID is required", errorCode: ERROR_CODES.BAD_REQUEST });
  }

  try {
    await Board.findByIdAndDelete(req.params.id);
    res.json({ message: "Board deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting board", errorCode: ERROR_CODES.SERVER_ERROR });
  }
};
