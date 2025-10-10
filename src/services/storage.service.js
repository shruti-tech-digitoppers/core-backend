import fs from "fs";
import path from "path";
import crypto from "crypto";

// Optional: lazy import AWS SDK v3 only if configured
let s3Client = null;
let S3_BUCKET = process.env.S3_BUCKET;
let STORAGE_DRIVER = process.env.STORAGE_DRIVER || "local";
let LOCAL_BUNDLES_DIR = process.env.LOCAL_BUNDLES_DIR || "storage";

// Canonical key utilities
const toPosix = (p) => String(p || "").split(path.sep).join(path.posix.sep);

const normalizeStorageKey = (key) => {
	let k = toPosix(key);
	k = k.replace(/^\/+/, "");
	const localPrefix = toPosix(`${LOCAL_BUNDLES_DIR}/`);
	if (k.startsWith(localPrefix)) k = k.slice(localPrefix.length);
	if (k.startsWith("storage/")) k = k.slice("storage/".length);
	return k;
};

const resolveLocalPath = (keyOrPath) => {
	if (!keyOrPath) return keyOrPath;
	if (path.isAbsolute(keyOrPath)) return keyOrPath;
	if (keyOrPath.startsWith(`${LOCAL_BUNDLES_DIR}${path.sep}`) || keyOrPath.startsWith(`${LOCAL_BUNDLES_DIR}/`)) {
		return keyOrPath;
	}
	return path.join(LOCAL_BUNDLES_DIR, normalizeStorageKey(keyOrPath));
};

const ensureLocalDir = () => {
	if (STORAGE_DRIVER === "local") {
		fs.mkdirSync(LOCAL_BUNDLES_DIR, { recursive: true });
	}
};

export const configureStorage = async () => {
	STORAGE_DRIVER = process.env.STORAGE_DRIVER || STORAGE_DRIVER;
	S3_BUCKET = process.env.S3_BUCKET || S3_BUCKET;
	LOCAL_BUNDLES_DIR = process.env.LOCAL_BUNDLES_DIR || LOCAL_BUNDLES_DIR;
	if (STORAGE_DRIVER === "s3" && !s3Client) {
		const { S3Client } = await import("@aws-sdk/client-s3");
		s3Client = new S3Client({ region: process.env.S3_REGION });
	}
	ensureLocalDir();
};

export const getPresignedPutUrl = async (key, contentType = "application/zip", expiresSeconds = 900) => {
	const relKey = normalizeStorageKey(key);
	if (STORAGE_DRIVER !== "s3") {
		const filePath = resolveLocalPath(relKey);
		return { driver: "local", filePath };
	}
	const { PutObjectCommand } = await import("@aws-sdk/client-s3");
	const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
	const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: relKey, ContentType: contentType });
	const url = await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
	return { driver: "s3", url };
};

export const getPresignedGetUrl = async (key, expiresSeconds = 900) => {
	if (STORAGE_DRIVER !== "s3") {
		const filePath = resolveLocalPath(key);
		return { driver: "local", filePath };
	}
	const { GetObjectCommand } = await import("@aws-sdk/client-s3");
	const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
	const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: normalizeStorageKey(key) });
	const url = await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
	return { driver: "s3", url };
};

export const streamLocalFileWithRange = (filePath, req, res) => {
	if (!fs.existsSync(filePath)) {
		res.status(404).end();
		return;
	}
	const stat = fs.statSync(filePath);
	const total = stat.size;
	const range = req.headers.range;
	if (range) {
		const parts = range.replace(/bytes=/, "").split("-");
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
		const chunkSize = end - start + 1;
		res.writeHead(206, {
			"Content-Range": `bytes ${start}-${end}/${total}`,
			"Accept-Ranges": "bytes",
			"Content-Length": chunkSize,
			"Content-Type": "application/zip"
		});
		fs.createReadStream(filePath, { start, end }).pipe(res);
	} else {
		res.writeHead(200, {
			"Content-Length": total,
			"Content-Type": "application/zip"
		});
		fs.createReadStream(filePath).pipe(res);
	}
};

export const computeFileSha256 = (filePath) => new Promise((resolve, reject) => {
	const hash = crypto.createHash("sha256");
	const stream = fs.createReadStream(filePath);
	stream.on("data", data => hash.update(data));
	stream.on("end", () => resolve(hash.digest("hex")));
	stream.on("error", reject);
});

export const getStorageLocator = (keyOrPath) => {
	if (STORAGE_DRIVER === "s3") return { s3Key: normalizeStorageKey(keyOrPath) };
	return { filePath: resolveLocalPath(keyOrPath) };
};

export const getLocalBundlesDir = () => LOCAL_BUNDLES_DIR;

export const openStorageReadStream = async (storageOrPath) => {
	// Accepts either a storage locator { s3Key | filePath } or a direct path/key string
	const storage = typeof storageOrPath === "string"
		? (STORAGE_DRIVER === "s3" ? { s3Key: normalizeStorageKey(storageOrPath) } : { filePath: resolveLocalPath(storageOrPath) })
		: storageOrPath || {};

	if (storage.s3Key) {
		if (!s3Client) {
			const { S3Client } = await import("@aws-sdk/client-s3");
			s3Client = new S3Client({ region: process.env.S3_REGION });
		}
		const { GetObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
		let sizeBytes = 0;
		try {
			const head = await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: storage.s3Key }));
			sizeBytes = Number(head.ContentLength || 0);
		} catch (e) {
			// HeadObject may fail due to permissions; fallback to GetObject ContentLength
		}
		const resp = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: storage.s3Key }));
		if (!sizeBytes) {
			const len = Number(resp.ContentLength || resp.Body?.bytes?.length || 0);
			if (Number.isFinite(len) && len > 0) sizeBytes = len;
		}
		return { stream: resp.Body, sizeBytes };
	}

	const filePath = storage.filePath || (typeof storageOrPath === "string" ? storageOrPath : undefined);
	if (!filePath) throw new Error("openStorageReadStream: missing file path or s3 key");
	const absPath = filePath; //path.isAbsolute(filePath) ? filePath : path.join(LOCAL_BUNDLES_DIR, filePath);
	const sizeBytes = fs.statSync(absPath).size;
	return { stream: fs.createReadStream(absPath), sizeBytes };
};

export const computeStorageSha256 = async (storageOrPath) => {
	const { stream } = await openStorageReadStream(storageOrPath);
	const hash = crypto.createHash("sha256");
	return await new Promise((resolve, reject) => {
		stream.on("data", chunk => hash.update(chunk));
		stream.on("end", () => resolve(hash.digest("hex")));
		stream.on("error", reject);
	});
};
