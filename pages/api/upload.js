import { admin, getAdminFirestore } from '../../src/lib/firebaseAdmin.js';
import { getCloudinary } from '../../src/lib/cloudinary.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb', // adjust if you need larger uploads
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ error: 'Missing auth token' });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const { caseId, name, type, size, data } = req.body || {};
    if (!caseId || !name || !type || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Diagnostics to help identify environment during setup
    try {
      // eslint-disable-next-line no-console
      console.log('API/upload start', {
        projectId: admin.app().options.projectId,
        cloudinary: { cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'unset' },
        userId,
        caseId,
        name,
        type,
        size,
      });
    } catch {}

    const db = getAdminFirestore();
    const caseRef = db.collection('cases').doc(caseId);
    const caseSnap = await caseRef.get();
    if (!caseSnap.exists) {
      // eslint-disable-next-line no-console
      console.warn('API/upload case not found', {
        projectId: admin.app().options.projectId,
        caseId,
      });
      return res.status(404).json({
        error: 'Case not found in server project',
      });
    }
    const caseData = caseSnap.data();
    if (caseData?.user_id !== userId) {
      return res.status(403).json({ error: 'Not allowed to modify this case' });
    }

    // Upload to Cloudinary
    const cld = getCloudinary();
    const dataUrl = `data:${type || 'application/octet-stream'};base64,${data}`;
    const folder = `cases/${caseId}`;
    const uploadRes = await cld.uploader.upload(dataUrl, {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      context: { caseId, userId },
    });
    const url = uploadRes.secure_url;

    const docEntry = {
      name,
      url,
      size: size || uploadRes?.bytes || null,
      content_type: type || uploadRes?.resource_type || '',
      uploaded_at: new Date().toISOString(),
      provider: 'cloudinary',
      public_id: uploadRes.public_id,
      format: uploadRes.format,
    };

    await caseRef.update({
      documents: admin.firestore.FieldValue.arrayUnion(docEntry),
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({ document: docEntry });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('API upload error:', e);
    const code = e?.code || e?.message || 'upload_failed';
    return res.status(500).json({ error: String(code) });
  }
}


