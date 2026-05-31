import express from 'express';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { verifyToken } from './auth.js';

dotenv.config();

const router = express.Router();

// Setup multer memory storage (stores file in RAM so we can process it with sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// POST /api/uploads/image
router.post('/image', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { folder } = req.body;
    
    // Compress image using Sharp
    // Resize to 1200px width (maintaining aspect ratio), convert to WebP, 80% quality
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const uniqueId = crypto.randomUUID();
    const s3Key = `${folder || 'uploads'}/${uniqueId}-${Date.now()}.webp`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: compressedBuffer,
      ContentType: 'image/webp',
    });

    await s3Client.send(command);

    // Construct the public URL
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.status(200).json({
      publicUrl,
      key: s3Key
    });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
