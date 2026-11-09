import { db } from '../config/db';
import type { Skill } from '../types/freelancer';

interface SkillRow {
  id: string;
  name: string;
}

export const listSkills = async (): Promise<Skill[]> => {
  return db
    .prepare('SELECT id, name FROM skills ORDER BY name COLLATE NOCASE ASC')
    .all() as unknown as SkillRow[];
};

export const getSkillsForUser = async (userId: string): Promise<Skill[]> => {
  return db
    .prepare(
      `SELECT sk.id, sk.name
       FROM user_skills us
       JOIN skills sk ON sk.id = us.skill_id
       WHERE us.user_id = ?
       ORDER BY sk.name COLLATE NOCASE ASC`,
    )
    .all(userId) as unknown as SkillRow[];
};
