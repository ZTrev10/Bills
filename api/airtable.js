export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token || !baseId) {
    return res.status(500).json({ error: 'Airtable env vars not configured' });
  }

  const { method } = req;
  const { path = '', offset, filterStatus, search } = req.query;

  const baseUrl = `https://api.airtable.com/v0/${baseId}/medicalBills`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    if (method === 'GET' && path === 'meta') {
      const r = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, { headers });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (method === 'POST' && path === 'ensure') {
      const r = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, { headers });
      const data = await r.json();
      if (data.tables && data.tables.find(t => t.name === 'medicalBills')) {
        return res.status(200).json({ exists: true });
      }
      const create = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'medicalBills',
          fields: [
            { name: 'claimId', type: 'singleLineText' },
            { name: 'date', type: 'singleLineText' },
            { name: 'provider', type: 'singleLineText' },
            { name: 'type', type: 'singleLineText' },
            { name: 'billed', type: 'number', options: { precision: 2 } },
            { name: 'allowed', type: 'number', options: { precision: 2 } },
            { name: 'yours', type: 'number', options: { precision: 2 } },
            { name: 'source', type: 'singleLineText' },
            { name: 'status', type: 'singleLineText' },
            { name: 'paidAmount', type: 'number', options: { precision: 2 } },
            { name: 'paidDate', type: 'singleLineText' },
            { name: 'notes', type: 'multilineText' },
            { name: 'pending', type: 'checkbox', options: { color: 'yellowBright', icon: 'check' } },
          ],
        }),
      });
      const created = await create.json();
      return res.status(200).json({ exists: false, created });
    }

    if (method === 'GET' && path === 'records') {
      let url = baseUrl + '?pageSize=100';
      if (offset) url += `&offset=${offset}`;
      const r = await fetch(url, { headers });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (method === 'POST' && path === 'records') {
      const r = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(req.body) });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (method === 'PATCH' && path === 'record') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const r = await fetch(`${baseUrl}/${id}`, { method: 'PATCH', headers, body: JSON.stringify(req.body) });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(404).json({ error: 'Unknown path' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
