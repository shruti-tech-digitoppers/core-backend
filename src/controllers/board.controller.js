import mongoose from 'mongoose';
import { Board } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find();
    res.json({ data: boards, message: 'Boards fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching boards', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;
    let board = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      board = await Board.findById(id);
    }
    if (!board) {
      board = await Board.findOne({ id: id });
    }
    if (!board) {
      return res.status(404).json({ message: 'Board not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ data: board, message: 'Board fetched successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching board', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createBoard = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Board data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const board = new Board(req.body);
    await board.save();
    res.json({ message: 'Board created', data: board });
  } catch (error) {
    res.status(500).json({ message: 'Error creating board', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const createBoardInBulk = async (req, res) => {
  if (!req.body || !Array.isArray(req.body)) {
    return res.status(400).json({ message: 'Boards data array is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    await Board.insertMany(req.body);
    res.json({ message: 'Boards created' });
  } catch (error) {
    res.status(500).json({ message: error.message, errorCode: ERROR_CODES.SERVER_ERROR });
  }
};

export const updateBoard = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: 'Board ID is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  if (!req.body) {
    return res.status(400).json({ message: 'Board data is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const { id } = req.params;
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const board = await Board.findOneAndUpdate(filter, req.body, { new: true });
    if (!board) {
      return res.status(404).json({ message: 'Board not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ message: 'Board updated', data: board });
  } catch (error) {
    res.status(500).json({ message: 'Error updating board', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};

export const deleteBoard = async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: 'Board ID is required', errorCode: ERROR_CODES.BAD_REQUEST });
  }
  try {
    const { id } = req.params;
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id: id };
    const board = await Board.findOneAndDelete(filter);
    if (!board) {
      return res.status(404).json({ message: 'Board not found', errorCode: ERROR_CODES.NOT_FOUND });
    }
    res.json({ message: 'Board deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting board', errorCode: ERROR_CODES.SERVER_ERROR, error: error.message });
  }
};
