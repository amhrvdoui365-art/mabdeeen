import { randomUUID } from 'node:crypto';
import type { SQLInputValue } from 'node:sqlite';
import { db, transaction } from '../config/db';
import type {
  FreelancerCard,
  FreelancerStats,
  PortfolioItem,
  PublicFreelancer,
  Review,
  Skill,
} from '../types/freelancer';
import { AppError } from '../utils/app-error';
import type {
  CreateReportInput,
  CreateReviewInput,
  UpdateProfileInput,
} from '../validators/freelancer.validator';
import { listPortfolioByUser } from './portfolio.model';
import { getSkillsForUser } from './skill.model';

interface FreelancerCardRow {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_available: number;
  is_featured: number;
  is_verified: number;
  avg_response_hours: number | null;
  created_at: string;
  avg_rating: number;
  review_count: number;
  skills: string | null;
}

interface FreelancerProfileRow {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_available: number;
  is_featured: number;
  is_verified: number;
  avg_response_hours: number | null;
  created_at: string;
}

interface ReviewRow {
  id: string;
  client_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface StatsRow {
  view_count: number;
  review_count: number;
  avg_rating: number;
}

interface ReportRow {
  id: string;
  reason: string;
  status: 'Pending' | 'Resolved';
  created_at: string;
}

export interface SearchFreelancersFilters {
  q?: string;
  skillId?: string;
  location?: string;
  governorate?: string;
  budget?: number;
  minBudget?: number;
  maxBudget?: number;
  featured?: boolean;
  available?: boolean;
  verified?: boolean;
  minRating?: number;
  maxResponseHours?: number;
  sort?: 'featured' | 'newest' | 'rating' | 'budget_low' | 'response';
  page: number;
  limit: number;
}

const parseSkills = (value: string | null): Skill[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((skill): skill is Skill => {
      return (
        typeof skill === 'object' &&
        skill !== null &&
        typeof (skill as Skill).id === 'string' &&
        typeof (skill as Skill).name === 'string'
      );
    });
  } catch {
    return [];
  }
};

const mapCard = (row: FreelancerCardRow): FreelancerCard => {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    isVerified: Boolean(row.is_verified),
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    createdAt: row.created_at,
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    skills: parseSkills(row.skills),
  };
};

const mapPublicFreelancer = (row: FreelancerProfileRow): PublicFreelancer => {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    isVerified: Boolean(row.is_verified),
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    createdAt: row.created_at,
  };
};

const mapReview = (row: ReviewRow): Review => {
  return {
    id: row.id,
    clientName: row.client_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
};

const mapStats = (row: StatsRow | undefined): FreelancerStats => {
  return {
    viewCount: Number(row?.view_count ?? 0),
    reviewCount: Number(row?.review_count ?? 0),
    avgRating: Number(row?.avg_rating ?? 0),
  };
};

const buildSearchClauses = (filters: SearchFreelancersFilters) => {
  const clauses = ["u.role = 'Freelancer'", 'u.is_active = 1', "u.account_status = 'ACTIVE'", 'u.profile_complete = 1'];
  const params: SQLInputValue[] = [];

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push(`(
      u.name LIKE ?
      OR u.title LIKE ?
      OR u.bio LIKE ?
      OR EXISTS (
        SELECT 1
        FROM user_skills qus
        JOIN skills qsk ON qsk.id = qus.skill_id
        WHERE qus.user_id = u.id AND qsk.name LIKE ?
      )
    )`);
    params.push(like, like, like, like);
  }

  if (filters.skillId) {
    clauses.push(`EXISTS (
      SELECT 1 FROM user_skills fus
      WHERE fus.user_id = u.id AND fus.skill_id = ?
    )`);
    params.push(filters.skillId);
  }

  if (filters.location) {
    clauses.push('u.location LIKE ?');
    params.push(`%${filters.location}%`);
  }

  if (filters.governorate) {
    clauses.push('u.location = ?');
    params.push(filters.governorate);
  }

  if (filters.verified === true) {
    clauses.push('u.is_verified = 1');
  }

  if (filters.minRating !== undefined) {
    clauses.push(`(
      SELECT COALESCE(AVG(r.rating), 0)
      FROM reviews r
      WHERE r.freelancer_id = u.id
    ) >= ?`);
    params.push(filters.minRating);
  }

  if (filters.maxResponseHours !== undefined) {
    clauses.push('u.avg_response_hours IS NOT NULL AND u.avg_response_hours <= ?');
    params.push(filters.maxResponseHours);
  }

  if (filters.budget !== undefined) {
    clauses.push('u.min_budget IS NOT NULL AND u.min_budget <= ?');
    params.push(filters.budget);
  }

  if (filters.minBudget !== undefined) {
    clauses.push('u.min_budget IS NOT NULL AND u.min_budget >= ?');
    params.push(filters.minBudget);
  }

  if (filters.maxBudget !== undefined) {
    clauses.push('u.min_budget IS NOT NULL AND u.min_budget <= ?');
    params.push(filters.maxBudget);
  }

  if (filters.featured === true) {
    clauses.push(
      `(u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    );
  }

  if (filters.available === true) {
    clauses.push('u.is_available = 1');
  }

  return { clauses, params };
};

const sortClause = (sort: SearchFreelancersFilters['sort']): string => {
  switch (sort) {
    case 'newest':
      return "CASE WHEN u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END DESC, u.created_at DESC";
    case 'rating':
      return "CASE WHEN u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END DESC, COALESCE(s.avg_rating, 0) DESC, COALESCE(s.review_count, 0) DESC, u.created_at DESC";
    case 'budget_low':
      return "CASE WHEN u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END DESC, CASE WHEN u.min_budget IS NULL THEN 1 ELSE 0 END ASC, u.min_budget ASC, u.created_at DESC";
    case 'response':
      return "CASE WHEN u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END DESC, CASE WHEN u.avg_response_hours IS NULL THEN 1 ELSE 0 END ASC, u.avg_response_hours ASC, u.created_at DESC";
    default:
      return "CASE WHEN u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END DESC, COALESCE(s.avg_rating, 0) DESC, u.created_at DESC";
  }
};

export const searchFreelancers = async (
  filters: SearchFreelancersFilters,
): Promise<{ items: FreelancerCard[]; total: number }> => {
  const { clauses, params } = buildSearchClauses(filters);
  const whereSql = clauses.join(' AND ');

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`)
    .get(...params) as { total: number } | undefined;

  const offset = (filters.page - 1) * filters.limit;

  const rows = db
    .prepare(
      `SELECT
         u.id,
         u.name,
         u.title,
         u.bio,
         u.location,
         u.min_budget,
         u.hourly_rate,
         u.avatar_url,
         u.is_available,
         CASE WHEN u.is_featured = 1 AND (u.featured_until IS NULL OR u.featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END AS is_featured,
         u.is_verified,
         u.avg_response_hours,
         u.created_at,
         COALESCE(s.avg_rating, 0) AS avg_rating,
         COALESCE(s.review_count, 0) AS review_count,
         COALESCE((
           SELECT json_group_array(json_object('id', sk.id, 'name', sk.name))
           FROM user_skills us
           JOIN skills sk ON sk.id = us.skill_id
           WHERE us.user_id = u.id
         ), '[]') AS skills
       FROM users u
       LEFT JOIN freelancer_stats s ON s.freelancer_id = u.id
       WHERE ${whereSql}
       ORDER BY ${sortClause(filters.sort)}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, filters.limit, offset) as unknown as FreelancerCardRow[];

  return {
    items: rows.map(mapCard),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const findPublicFreelancerById = async (
  id: string,
): Promise<PublicFreelancer | null> => {
  const row = db
    .prepare(
      `SELECT id, name, title, bio, location,
              min_budget, hourly_rate, avatar_url,
              is_available, CASE WHEN is_featured = 1 AND (featured_until IS NULL OR featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END AS is_featured, is_verified,
              avg_response_hours, created_at
       FROM users
       WHERE id = ? AND role = 'Freelancer' AND is_active = 1 AND account_status = 'ACTIVE' AND profile_complete = 1
       LIMIT 1`,
    )
    .get(id) as FreelancerProfileRow | undefined;

  return row ? mapPublicFreelancer(row) : null;
};

export const findFreelancerForEvent = async (
  id: string,
): Promise<{ id: string; name: string } | null> => {
  const row = db.prepare(`SELECT id, name FROM users
    WHERE id = ? AND role = 'Freelancer' AND is_active = 1 AND account_status = 'ACTIVE' AND profile_complete = 1 LIMIT 1`)
    .get(id) as { id: string; name: string } | undefined;
  return row ?? null;
};

export const getPublicPortfolio = async (userId: string): Promise<PortfolioItem[]> => {
  return listPortfolioByUser(userId);
};

export const getPublicReviews = async (freelancerId: string): Promise<Review[]> => {
  const rows = db
    .prepare(
      `SELECT id, client_name, rating, comment, created_at
       FROM reviews
       WHERE freelancer_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .all(freelancerId) as unknown as ReviewRow[];

  return rows.map(mapReview);
};

export const getFreelancerStats = async (
  freelancerId: string,
): Promise<FreelancerStats> => {
  const row = db
    .prepare(
      `SELECT view_count, review_count, avg_rating
       FROM freelancer_stats
       WHERE freelancer_id = ?`,
    )
    .get(freelancerId) as StatsRow | undefined;

  return mapStats(row);
};

export const recordProfileEvent = async (freelancerId: string): Promise<number> => {
  db.prepare(
    `INSERT INTO profile_events (freelancer_id, event_type)
     VALUES (?, ?)`,
  ).run(freelancerId, 'View');
  const row = db.prepare('SELECT COUNT(*) AS count FROM profile_events WHERE freelancer_id = ? AND event_type = ?')
    .get(freelancerId, 'View') as { count: number };
  return Number(row.count);
};

export const createReview = async (
  freelancerId: string,
  input: CreateReviewInput,
): Promise<Review> => {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO reviews (id, freelancer_id, client_name, rating, comment)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    freelancerId,
    input.clientName,
    input.rating,
    input.comment ?? null,
  );

  const row = db
    .prepare(
      `SELECT id, client_name, rating, comment, created_at
       FROM reviews WHERE id = ?`,
    )
    .get(id) as ReviewRow | undefined;

  if (!row) {
    throw new Error('Failed to create review');
  }

  return mapReview(row);
};

export const createReport = async (
  freelancerId: string,
  input: CreateReportInput,
): Promise<{ id: string; status: string; createdAt: string }> => {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO reports (id, freelancer_id, reason)
     VALUES (?, ?, ?)`,
  ).run(id, freelancerId, input.reason);

  const row = db
    .prepare('SELECT id, reason, status, created_at FROM reports WHERE id = ?')
    .get(id) as ReportRow | undefined;

  if (!row) {
    throw new Error('Failed to create report');
  }

  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
  };
};

export const getOwnProfile = async (userId: string) => {
  const user = await findFreelancerById(userId);
  const skills = await getSkillsForUser(userId);
  const stats = await getFreelancerStats(userId);

  return { user, skills, stats };
};

export const findFreelancerById = async (
  userId: string,
): Promise<PublicFreelancer | null> => {
  const row = db
    .prepare(
      `SELECT id, name, title, bio, location,
              min_budget, hourly_rate, avatar_url,
              is_available, CASE WHEN is_featured = 1 AND (featured_until IS NULL OR featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) THEN 1 ELSE 0 END AS is_featured, is_verified,
              avg_response_hours, created_at
       FROM users
       WHERE id = ? AND role = 'Freelancer'
       LIMIT 1`,
    )
    .get(userId) as FreelancerProfileRow | undefined;

  return row ? mapPublicFreelancer(row) : null;
};

const PROFILE_COLUMNS: Record<string, string> = {
  name: 'name',
  bio: 'bio',
  title: 'title',
  location: 'location',
  minBudget: 'min_budget',
  hourlyRate: 'hourly_rate',
  avatarUrl: 'avatar_url',
};

export const updateFreelancerProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<void> => {
  transaction(() => {
    const assignments: string[] = [];
    const values: SQLInputValue[] = [];

    for (const [field, column] of Object.entries(PROFILE_COLUMNS)) {
      const value = input[field as keyof UpdateProfileInput];

      if (
        value !== undefined &&
        !Array.isArray(value) &&
        typeof value !== 'boolean'
      ) {
        values.push(value);
        assignments.push(`${column} = ?`);
      }
    }

    if (input.isAvailable !== undefined) {
      values.push(input.isAvailable ? 1 : 0);
      assignments.push('is_available = ?');
    }

    if (assignments.length > 0) {
      db.prepare(
        `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
      ).run(...values, userId);
    }

    if (input.skillIds !== undefined) {
      if (input.skillIds.length > 0) {
        const placeholders = input.skillIds.map(() => '?').join(', ');
        const rows = db
          .prepare(`SELECT id FROM skills WHERE id IN (${placeholders})`)
          .all(...input.skillIds) as unknown as Array<{ id: string }>;

        if (rows.length !== input.skillIds.length) {
          throw new AppError('بعض المهارات المحددة غير موجودة', 400);
        }
      }

      db.prepare('DELETE FROM user_skills WHERE user_id = ?').run(userId);

      const insertSkill = db.prepare(
        'INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)',
      );

      for (const skillId of input.skillIds) {
        insertSkill.run(userId, skillId);
      }
    }
  });
};
