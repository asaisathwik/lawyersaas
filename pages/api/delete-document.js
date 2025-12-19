import { admin, getAdminFirestore } from '../../src/lib/firebaseAdmin.js';
import { getCloudinary } from '../../src/lib/cloudinary.js';

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

    const { caseId, document } = req.body || {};
    if (!caseId || !document) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const db = getAdminFirestore();
    const caseRef = db.collection('cases').doc(caseId);
    const snap = await caseRef.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    const data = snap.data();
    if (data?.user_id !== userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    // Attempt remote deletion if Cloudinary-backed
    try {
      if (document?.provider === 'cloudinary' && document?.public_id) {
        const cld = getCloudinary();
        let resourceType = 'raw';
        const contentType = (document?.content_type || '').toLowerCase();
        if (contentType.startsWith('image')) resourceType = 'image';
        else if (contentType.startsWith('video')) resourceType = 'video';
        await cld.uploader.destroy(document.public_id, { resource_type: resourceType });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Cloudinary destroy failed (continuing):', e?.message || e);
    }

    await caseRef.update({
      documents: admin.firestore.FieldValue.arrayRemove(document),
      updated_at: new Date().toISOString(),
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('delete-document error:', e);
    return res.status(500).json({ error: e?.message || 'delete_failed' });
  }
}


