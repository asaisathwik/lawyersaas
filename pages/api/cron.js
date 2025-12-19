
export default function handler(req, res) {
    const secret = req.query.secret;
  
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  
    // Your cron logic here
    return res.status(200).json({ ok: true, message: "Cron working" });
  }
  