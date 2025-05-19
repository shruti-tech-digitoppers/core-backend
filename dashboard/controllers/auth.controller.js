import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/mongo.model.js';

export const register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword, role });
  await user.save();
  res.status(201).json({ message: 'User registered successfully', user });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'User not found' });
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) return res.status(401).json({ message: 'Invalid password' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.status(200).json({
    message: 'Login successful',
    data: { token, id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

export const refreshToken = async (req, res) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    res.status(200).json({ message: 'Token is valid', decoded });
  });
};
