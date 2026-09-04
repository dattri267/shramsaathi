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


module.exports = {
  getSkills,
  getSkill
};