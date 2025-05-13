import mongoose from 'mongoose';
import userSchema from './users.mongo.model.js';

const User = mongoose.model('User', userSchema);

export { User };