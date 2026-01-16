-- Seed curated opportunities: events, jobs, scholarships, and grants (Jan 2026)
INSERT INTO public.opportunities (
  title,
  provider,
  category,
  description,
  link,
  deadline,
  event_date,
  state,
  is_verified,
  is_remote,
  level
)
VALUES
  -- Tech Events & Conferences
  (
    'Lagos Tech Fest 2026',
    'Eventhive',
    'tech',
    'Major tech ecosystem event with conferences, exhibitions, networking, pitches, and investor meetings for startups, leaders, and innovators.',
    'https://tech.eventhive.ng/Africa',
    NULL,
    '2026-02-17T00:00:00Z',
    'Lagos',
    true,
    false,
    NULL
  ),
  (
    'Tech Summit Nairobi 2026',
    'Africa Tech Summit Nairobi',
    'tech',
    'Pan-African tech summit connecting tech leaders, investors, startups, fintech, and corporates with open registration for Nigerian participants.',
    'https://www.africatechsummit.com/nairobi',
    NULL,
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  ),

  -- Social & Networking Events
  (
    'Abuja International College Fair 2026',
    'Abuja International College Fair',
    'social',
    'International education fair in Abuja (Transcorp Hilton) focused on networking, scholarships, and college information for prospective students.',
    'https://www.eventbrite.com/d/nigeria--abuja/events/',
    NULL,
    '2026-01-31T00:00:00Z',
    'FCT (Abuja)',
    true,
    false,
    NULL
  ),
  (
    'Abuja International Education Fair 2026',
    'Abuja Education Fair',
    'social',
    'Education fair in Abuja with January/February 2026 schedule (exact dates TBA). Offers networking and information on study opportunities in Nigeria and abroad.',
    'https://www.eventbrite.com/d/nigeria--abuja/events/',
    NULL,
    NULL,
    'FCT (Abuja)',
    true,
    false,
    NULL
  ),
  (
    'Lekkside Education Workshop & Networking Abuja 2026',
    'Lekkside Education Agency',
    'social',
    'Workshop-focused networking event by Lekkside Education Agency in Abuja, covering education, admission guidance, and career-focused conversations.',
    'https://www.eventbrite.com/d/nigeria--abuja/events/',
    NULL,
    NULL,
    'FCT (Abuja)',
    true,
    false,
    NULL
  ),

  -- Recruitments & Job Vacancies
  (
    'MyJobMag – Latest Vacancies (Nationwide)',
    'MyJobMag',
    'career',
    'Aggregated latest vacancies across Nigeria including tech, corporate, sales, admin, and entry-level roles updated for January 2026.',
    'https://www.myjobmag.com/jobs-by-field',
    NULL,
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  ),
  (
    'NGO & Non-Profit Jobs – HotNigerianJobs NGO Section',
    'HotNigerianJobs NGO Section',
    'ngo',
    'Over 250 active NGO and non-profit roles (policy, operations, health, and field roles) from organizations such as DRC, NRC, and MSF across Nigeria.',
    'https://www.hotnigerianjobs.com/industry/127',
    NULL,
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  ),
  (
    'Daily Job Listings & Internships – HotNigerianJobs Today',
    'HotNigerianJobs',
    'career',
    'Daily refreshed listings with 500+ roles including graduate, admin, IT, and other entry-level opportunities across Nigeria.',
    'https://www.hotnigerianjobs.com/jobs/today',
    NULL,
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  ),

  -- Scholarships
  (
    'Davidson Oturu Mentorship Programme Law School Scholarship',
    'Davidson Oturu',
    'scholarship',
    'Law School scholarship programme for prospective Nigerian Law School students with funding support. Applications and full details available via ScholarshipAir and official channels.',
    'https://www.scholarshipair.com/',
    '2026-01-15T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    'Law School'
  ),
  (
    'Muslim Scholarship Fund in Nigeria (MSFN)',
    'MSFN',
    'scholarship',
    'Scholarship fund targeting Nigerian Muslim undergraduates and SSS students from low-income backgrounds, providing financial aid support.',
    'https://www.scholarshipset.com/',
    '2026-01-19T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    'Undergraduate/SSS'
  ),
  (
    'E-JUST TICAD8 African Scholarships for STI',
    'Egypt-Japan University of Science and Technology (E-JUST)',
    'scholarship',
    'Fully funded Masters and PhD scholarships for Africans, including Nigerians, in Science, Technology, and Innovation (STI) fields under the TICAD8 framework.',
    'https://www.scholarshipair.com/',
    '2026-02-15T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    'Masters/PhD'
  ),
  (
    'Government of Brunei Darussalam Scholarship 2026',
    'Government of Brunei Darussalam',
    'scholarship',
    'Fully funded undergraduate and master''s scholarships in Brunei for international students including Nigerians, covering tuition and living costs.',
    'https://www.scholarshipair.com/',
    '2026-02-15T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    'Undergraduate/Masters'
  ),

  -- Grants
  (
    'IKI Small Grants Programme – Climate & Biodiversity',
    'International Climate Initiative (IKI)',
    'ngo',
    'Small grants programme supporting local NGOs working on climate and biodiversity projects. Grants typically range between €60,000 and €200,000.',
    'https://iki-small-grants.de/',
    '2026-01-15T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  ),
  (
    'OceanHub Africa Grants – Plastic Waste Solutions',
    'OceanHub Africa / Coca-Cola Foundation',
    'ngo',
    'Grant programme supporting innovative solutions that reduce plastic waste in Africa, with a combined funding pool around $120,000.',
    'https://www2.fundsforngos.org/',
    '2026-02-15T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  ),
  (
    'AU-EU Youth Cooperation Grants',
    'AU-EU Youth Action Lab',
    'ngo',
    'Grants for youth organizations in Nigeria and other African countries focused on AU-EU cooperation, with awards up to approximately €50,000.',
    'https://africanngos.org/',
    '2026-02-12T23:59:59Z',
    NULL,
    'Nationwide',
    true,
    false,
    NULL
  );

