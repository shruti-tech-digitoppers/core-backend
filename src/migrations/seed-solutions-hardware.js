import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Solution, Hardware } from '../models/mongo.model.js';

export const seedSolutionsAndHardware = async ({ logger = console } = {}) => {
  logger.log('--- Seeding Solutions & Hardware (with embedded spec) into Core Backend ---');

  const solutionDefs = [
    {
      key: 'SMART_SHALA',
      label: 'Smart Shaala',
      name: 'Smart Shaala Classroom',
      description: 'Interactive flat panel display setup for classrooms',
      desc: 'Interactive flat panel display setup for classrooms',
      icon: '🏫',
      platform: 'ifp',
      platforms: ['ifp', 'windows'],
      licenseRequired: true,
      index: 1,
      isActive: true,
    },
    {
      key: 'EPATHSHALA_LAB',
      label: 'ePathshala Lab',
      name: 'ePathshala Digital LMS Lab',
      description: 'Interactive student device lab with tablets / Android laptops',
      desc: 'Interactive student device lab with tablets / Android laptops',
      icon: '📱',
      platform: 'tablet',
      platforms: ['tablet', 'android_laptop'],
      licenseRequired: true,
      index: 2,
      isActive: true,
    },
    {
      key: 'STEM_LAB',
      label: 'STEM Lab',
      name: 'STEM Innovation Lab',
      description: 'Robotics, IoT and science innovation kits',
      desc: 'Robotics, IoT and science innovation kits',
      icon: '🔬',
      platform: null,
      platforms: ['windows', 'linux'],
      licenseRequired: false,
      index: 3,
      isActive: true,
    },
    {
      key: 'ROBOTICS',
      label: 'Robotics Lab',
      name: 'AI & Robotics Modular Lab',
      description: 'Coding, AI, IoT modular robotics kits',
      desc: 'Coding, AI, IoT modular robotics kits',
      icon: '🤖',
      platform: null,
      platforms: ['windows', 'linux'],
      licenseRequired: false,
      index: 4,
      isActive: true,
    },
    {
      key: 'ASTRONOMY',
      label: 'Astronomy Lab',
      name: 'Astronomy & Space Science Center',
      description: 'Telescopes & planetarium observation kits',
      desc: 'Telescopes & planetarium observation kits',
      icon: '🔭',
      platform: null,
      platforms: [],
      licenseRequired: false,
      index: 5,
      isActive: true,
    },
    {
      key: 'LANGUAGE',
      label: 'Language Lab',
      name: 'Digital English Language Lab',
      description: 'Audio-visual communication & phonetics lab',
      desc: 'Audio-visual communication & phonetics lab',
      icon: '🎧',
      platform: null,
      platforms: ['windows', 'tablet'],
      licenseRequired: false,
      index: 6,
      isActive: true,
    },
  ];

  const solutionMap = {};
  for (const sol of solutionDefs) {
    const existing = await Solution.findOne({ key: sol.key });
    if (existing) {
      await Solution.updateOne({ _id: existing._id }, { $set: sol });
      solutionMap[sol.key] = existing._id;
      logger.log(`Updated Solution: ${sol.key}`);
    } else {
      const created = await Solution.create(sol);
      solutionMap[sol.key] = created._id;
      logger.log(`Created Solution: ${sol.key}`);
    }
  }

  // Support aliases
  if (solutionMap['SMART_SHALA']) {
    solutionMap['SMART_SHAALA'] = solutionMap['SMART_SHALA'];
  }
  if (solutionMap['EPATHSHALA_LAB']) {
    solutionMap['EPATHSHALA'] = solutionMap['EPATHSHALA_LAB'];
  }

  const hardwareDefs = [
    {
      key: 'IFP_75',
      label: '75" 4K IFP',
      name: '75" 4K UHD Interactive Flat Panel',
      spec: '75" 4K UHD Anti-Glare, 400 nits, 4GB/32GB Android 13, Dual Stylus',
      specs: [
        '75" 4K UHD (3840x2160)',
        'Anti-Glare 4mm Toughened Glass',
        '20-Point Multi-Touch',
        '4GB RAM / 32GB Storage Android 13',
        'Dual Stylus & Magnetic Pen Holder',
      ],
      description: '75" Ultra HD Interactive Touch Display for Classrooms',
      icon: '🖥️',
      category: 'DISPLAY',
      unit: 'NOS',
      solutions: [solutionMap['SMART_SHALA']],
      departmentCode: 'OPS',
      index: 1,
      isActive: true,
    },
    {
      key: 'OPS_I5',
      label: 'OPS i5 PC',
      name: 'OPS Windows 11 Pro i5 16GB/512GB PC',
      spec: 'Intel Core i5 11th/12th Gen, 16GB DDR4, 512GB NVMe SSD, Windows 11 Pro',
      specs: [
        'Intel Core i5 Processor',
        '16GB DDR4 RAM',
        '512GB M.2 NVMe SSD',
        'Windows 11 Pro Licensed',
        'Dual Band Wi-Fi 6 & Bluetooth 5.2',
      ],
      description: 'Modular OPS computing unit for Interactive Display',
      icon: '💻',
      category: 'COMPUTING',
      unit: 'NOS',
      solutions: [solutionMap['SMART_SHALA']],
      departmentCode: 'TECH',
      index: 2,
      isActive: true,
    },
    {
      key: 'TABLET_10',
      label: '10" Student Tablet',
      name: '10.1" Android Octa-core Student Tablet',
      spec: '10.1" IPS WUXGA (1920x1200), Octa-core 2.0 GHz, 4GB RAM, 64GB ROM, Android 13',
      specs: [
        '10.1" Full HD IPS Display',
        'Octa-core 2.0 GHz CPU',
        '4GB RAM / 64GB Storage',
        '6000 mAh All-day Battery',
        'Ruggedized Protective Bumper Case',
      ],
      description: 'Ruggedized multi-touch student learning tablet',
      icon: '📱',
      category: 'COMPUTING',
      unit: 'NOS',
      solutions: [solutionMap['EPATHSHALA_LAB']],
      departmentCode: 'OPS',
      index: 3,
      isActive: true,
    },
    {
      key: 'ANDROID_LAPTOP',
      label: 'Android Laptop',
      name: 'Ruggedized Android Education Laptop',
      spec: '11.6" HD Display, Octa-Core, 4GB RAM, 64GB eMMC, Full Physical QWERTY Keyboard',
      specs: [
        '11.6" Anti-glare Screen',
        'Full Water-resistant QWERTY Keyboard',
        '4GB RAM / 64GB eMMC',
        'Dual HD Stereo Speakers',
      ],
      description: 'Classroom laptop running Android with physical keyboard',
      icon: '💻',
      category: 'COMPUTING',
      unit: 'NOS',
      solutions: [solutionMap['EPATHSHALA_LAB']],
      departmentCode: 'OPS',
      index: 4,
      isActive: true,
    },
    {
      key: 'ROBOTICS_KIT',
      label: 'Robotics Starter Kit',
      name: 'Modular Robotics & Microcontroller Kit',
      spec: 'Arduino / ESP32 programmable microcontroller, 20+ sensors, servo motors, chassis',
      specs: [
        'ESP32 Wi-Fi/BT Board',
        'Ultrasonic, IR, Gyro, Temperature Sensors',
        'Dual Geared Motors & Motor Driver',
        'Rechargeable Li-Ion Battery Pack',
      ],
      description: 'Arduino & ESP32 based modular robotics experimentation set',
      icon: '🤖',
      category: 'LAB_KIT',
      unit: 'SETS',
      solutions: [solutionMap['ROBOTICS'], solutionMap['STEM_LAB']].filter(Boolean),
      departmentCode: 'TECH',
      index: 5,
      isActive: true,
    },
    {
      key: 'PENDRIVE_64',
      label: '64GB USB Key',
      name: 'Offline Curriculum USB 3.2 64GB',
      spec: 'USB 3.2 Gen 1 64GB High Speed Metal Pen Drive with AES Hardware Encryption',
      specs: [
        'USB 3.2 Gen 1 (up to 150 MB/s read)',
        '64GB High Endurance Flash',
        'Preloaded with Encrypted Digital Curriculum',
      ],
      description: 'Encrypted offline curriculum master key',
      icon: '💾',
      category: 'STORAGE',
      unit: 'NOS',
      solutions: [solutionMap['SMART_SHALA'], solutionMap['EPATHSHALA_LAB']].filter(Boolean),
      departmentCode: 'OPS',
      index: 6,
      isActive: true,
    },
    {
      key: 'WALL_MOUNT',
      label: 'Wall Mount',
      name: 'Heavy Duty IFP Wall Mount Bracket',
      spec: 'VESA 800x400 to 1000x600 Cold Rolled Steel Bracket, Max load 120 kg',
      specs: [
        'Cold-rolled heavy gauge steel (SPCC)',
        'Supports panels 65" to 86"',
        'Load capacity up to 120 kg',
        'Integrated Spirit Level & Anti-drop Safety Lock',
      ],
      description: 'Heavy duty steel wall mount for 65"-86" panels',
      icon: '🔩',
      category: 'ACCESSORY',
      unit: 'NOS',
      solutions: [solutionMap['SMART_SHALA']],
      departmentCode: 'OPS',
      index: 7,
      isActive: true,
    },
  ];

  for (const hw of hardwareDefs) {
    const existing = await Hardware.findOne({ key: hw.key });
    if (existing) {
      await Hardware.updateOne({ _id: existing._id }, { $set: hw });
      logger.log(`Updated Hardware: ${hw.key} (with embedded spec)`);
    } else {
      await Hardware.create(hw);
      logger.log(`Created Hardware: ${hw.key} (with embedded spec)`);
    }
  }

  logger.log('--- Solutions & Hardware seeding completed successfully! ---');
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  dotenv.config();
  const uri = process.env.NODE_ENV === 'production' ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
  if (!uri) {
    console.error('Missing MongoDB URI in environment variables.');
    process.exit(1);
  }
  mongoose
    .connect(uri, { autoIndex: false })
    .then(() => seedSolutionsAndHardware())
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('Error seeding solutions and hardware:', err);
      process.exit(1);
    });
}
