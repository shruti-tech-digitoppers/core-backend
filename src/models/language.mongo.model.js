import mongoose from 'mongoose';

export default new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: [
        'हिन्दी',
        'English',
        'मराठी',
        'ગુજરાતી',
        'தமிழ்',
        'తెలుగు',
        'ಕನ್ನಡ',
        'മലയാളം',
        'ತುಳು',
        'Konkani',
        'Urdu',
        'বাংলা',
        'ଓଡ଼ିଆ',
        'অসমীয়া',
        'ਪੰਜਾਬੀ',
        'संस्कृत',
      ],
    },
    id: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'hi',
        'en',
        'mar',
        'guj',
        'tam',
        'tel',
        'kan',
        'mal',
        'tul',
        'kon',
        'ur',
        'bn',
        'odia',
        'asm',
        'pun',
        'san',
      ],
    },
    icon: {
      type: String,
    },
    color: {
      type: String,
    },
    index: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    short_name: {
      type: String,
      enum: ['HIN', 'ENG', 'MAR', 'GUJ', 'TAM', 'TEL', 'KAN', 'MAL', 'TUL', 'KON', 'URDU', 'BNG', 'ODIA', 'ASM', 'PUN', 'SAN'],
    },
  },
  {
    timestamps: true,
  }
);
