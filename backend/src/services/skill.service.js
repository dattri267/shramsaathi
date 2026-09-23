const prisma = require('../config/db');


function makeSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}


/**
 * GET all skills.
 *
 * The slug is returned even if the database has not yet
 * been migrated, so the API remains easy for Expo to consume.
 */
async function getSkills() {
  const rows =
    await prisma.$queryRaw`
      SELECT
        id,
        name,
        slug,
        description,
        created_at

      FROM skills

      ORDER BY name ASC
    `;

  return rows.map(
    (skill) => ({
      ...skill,

      slug:
        skill.slug ||
        makeSlug(skill.name)
    })
  );
}


/**
 * Find one skill using:
 *
 * UUID
 * slug
 * name
 */
async function getSkill(
  value
) {
  if (!value) {
    return null;
  }

  const input =
    String(value).trim();


  const rows =
    await prisma.$queryRaw`
      SELECT
        id,
        name,
        slug,
        description,
        created_at

      FROM skills

      WHERE
        (
          id =
            CASE
              WHEN ${input} ~
                '^[0-9a-fA-F-]{36}$'
              THEN ${input}::uuid
              ELSE NULL
            END
        )

        OR LOWER(slug) =
           LOWER(${input})

        OR LOWER(name) =
           LOWER(${input})

      LIMIT 1
    `;


  if (
    rows.length === 0
  ) {
    return null;
  }


  return {
    ...rows[0],

    slug:
      rows[0].slug ||
      makeSlug(
        rows[0].name
      )
  };
}


/**
 * Get skills that have at least one subskill, together with their
 * database-backed subskills. This is used by worker registration so
 * the primary service list is derived from the actual skills -> subskills
 * relationship rather than hard-coded values.
 */
async function getSkillsWithSubskills() {
  const rows = await prisma.$queryRaw`
    SELECT
      s.id AS skill_id,
      s.name AS skill_name,
      s.description AS skill_description,
      s.slug AS skill_slug,
      ss.id AS subskill_id,
      ss.name AS subskill_name,
      ss.description AS subskill_description
    FROM skills s
    INNER JOIN subskills ss
      ON ss.skill_id = s.id
    ORDER BY s.name ASC, ss.name ASC
  `;

  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.skill_id)) {
      grouped.set(row.skill_id, {
        id: row.skill_id,
        name: row.skill_name,
        description: row.skill_description,
        // Slug is retained for backward compatibility, but registration
        // uses IDs so it does not depend on slug being populated.
        slug: row.skill_slug || null,
        subskills: [],
      });
    }

    grouped.get(row.skill_id).subskills.push({
      id: row.subskill_id,
      skill_id: row.skill_id,
      name: row.subskill_name,
      description: row.subskill_description,
    });
  }

  return Array.from(grouped.values());
}


module.exports = {
  getSkills,
  getSkill,
  getSkillsWithSubskills
};