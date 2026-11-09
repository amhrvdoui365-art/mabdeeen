import { randomUUID } from 'node:crypto';
import { db } from '../config/db';
import type { Service, ServiceDraft, ServiceMedia, ServiceSource, ServiceStatus } from '../types/service';

interface ServiceRow {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_avatar_url: string | null;
  title: string;
  description: string;
  price: number;
  category: string;
  media_json: string;
  sources_json: string;
  status: ServiceStatus;
  created_at: string;
}

const SELECT_SERVICES = `
  SELECT s.id, s.freelancer_id, u.name AS freelancer_name,
         u.avatar_url AS freelancer_avatar_url, s.title, s.description,
         s.price, s.category, s.media_json, s.sources_json, s.status, s.created_at
  FROM services s
  JOIN users u ON u.id = s.freelancer_id
`;

const mapService = (row: ServiceRow): Service => ({
  id: row.id,
  freelancerId: row.freelancer_id,
  freelancerName: row.freelancer_name,
  freelancerAvatarUrl: row.freelancer_avatar_url,
  title: row.title,
  description: row.description,
  price: Number(row.price),
  category: row.category,
  media: JSON.parse(row.media_json || '[]') as ServiceMedia[],
  sources: JSON.parse(row.sources_json || '[]') as ServiceSource[],
  status: row.status,
  createdAt: row.created_at,
});

export const listActiveServices = (freelancerId?: string): Service[] => {
  const rows = freelancerId
    ? db.prepare(`${SELECT_SERVICES}
        WHERE s.status = 'active' AND s.freelancer_id = ? AND u.is_active = 1 AND u.account_status = 'ACTIVE'
        ORDER BY CASE WHEN s.featured_until IS NOT NULL AND s.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END DESC, s.created_at DESC`).all(freelancerId)
    : db.prepare(`${SELECT_SERVICES}
        WHERE s.status = 'active' AND u.is_active = 1 AND u.account_status = 'ACTIVE'
        ORDER BY CASE WHEN s.featured_until IS NOT NULL AND s.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END DESC,
          CASE WHEN u.is_featured = 1 AND
          (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          THEN 1 ELSE 0 END DESC, s.created_at DESC`).all();

  return (rows as unknown as ServiceRow[]).map(mapService);
};

export const listServicesByFreelancer = (freelancerId: string): Service[] => {
  const rows = db.prepare(`${SELECT_SERVICES}
    WHERE s.freelancer_id = ?
    ORDER BY s.created_at DESC`).all(freelancerId) as unknown as ServiceRow[];

  return rows.map(mapService);
};

export const findServiceById = (id: string): Service | null => {
  const row = db.prepare(`${SELECT_SERVICES} WHERE s.id = ? LIMIT 1`).get(id) as
    | ServiceRow
    | undefined;

  return row ? mapService(row) : null;
};

export const createService = (freelancerId: string, draft: ServiceDraft): Service => {
  const id = randomUUID();
  db.prepare(`INSERT INTO services
    (id, freelancer_id, title, description, price, category, media_json, sources_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, freelancerId, draft.title, draft.description, draft.price, draft.category,
      JSON.stringify(draft.media ?? []), JSON.stringify(draft.sources ?? []), draft.status ?? 'active');

  return findServiceById(id)!;
};

export const updateService = (
  id: string,
  freelancerId: string,
  patch: Partial<ServiceDraft>,
): Service | null => {
  const columns: Record<keyof ServiceDraft, string> = {
    title: 'title',
    description: 'description',
    price: 'price',
    category: 'category',
    media: 'media_json',
    sources: 'sources_json',
    status: 'status',
  };
  const assignments: string[] = [];
  const values: Array<string | number> = [];

  for (const [field, column] of Object.entries(columns) as Array<[keyof ServiceDraft, string]>) {
    const value = patch[field];
    if (value !== undefined) {
      assignments.push(`${column} = ?`);
      values.push(field === 'media' || field === 'sources' ? JSON.stringify(value) : value as string | number);
    }
  }

  if (assignments.length > 0) {
    db.prepare(`UPDATE services SET ${assignments.join(', ')} WHERE id = ? AND freelancer_id = ?`)
      .run(...values, id, freelancerId);
  }

  return findServiceById(id);
};

export const deleteService = (id: string, freelancerId: string): boolean =>
  db.prepare('DELETE FROM services WHERE id = ? AND freelancer_id = ?').run(id, freelancerId).changes > 0;
