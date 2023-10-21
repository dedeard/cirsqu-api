import algoliasearch from 'algoliasearch';
import admin from 'firebase-admin';
import lessonsData from './lessons-data';

const lessonCollection = admin.firestore().collection('lessons');
const episodeCollection = admin.firestore().collection('episodes');
const subjectCollection = admin.firestore().collection('subjects');

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const fetchSubjects = async () => {
  const subjectsSnapshot = await subjectCollection.get();
  const subjects: Record<string, { id: string; name: string; slug: string }> = {};
  subjectsSnapshot.docs.forEach((subject) => {
    subjects[subject.data().slug] = {
      id: subject.id,
      name: subject.data().name,
      slug: subject.data().slug,
    };
  });
  console.log('Fetched subjects');
  return subjects;
};

const calculateTotalSeconds = (episodes) => {
  const totalSeconds = episodes.reduce((total, episode) => total + episode.seconds, 0);
  return totalSeconds;
};

const updateLesson = async (data) => {
  const snapshot = await lessonCollection.where('slug', '==', data.slug).get();

  if (snapshot.empty) {
    const lessonRef = await lessonCollection.add(data);
    console.log('Added a new lesson:', data.slug);
    return lessonRef.id;
  } else {
    const result = snapshot.docs[0];
    await result.ref.update(data);
    console.log('Updated an existing lesson:', data.slug);
    return result.id;
  }
};

const initEpisodes = async (lessonId, episodes, premiumRange) => {
  for (let i = 0; i < episodes.length; i++) {
    const episodeData = {
      lessonId,
      videoId: episodes[i].id,
      title: episodes[i].title,
      seconds: episodes[i].seconds,
      description: episodes[i].description,
      index: i,
      premium: i > premiumRange,
      downloadUrl: `https://www.youtube.com/watch?v=${episodes[i].id}`,
    };

    const snapshot = await episodeCollection.where('lessonId', '==', lessonId).where('videoId', '==', episodeData.videoId).get();
    if (snapshot.empty) {
      await episodeCollection.add(episodeData);
      console.log('Added an episode for lesson:', lessonId);
    } else {
      await snapshot.docs[0].ref.update(episodeData);
      console.log('Updated an episode for lesson:', lessonId);
    }
  }
};

const updateAlgoliaIndex = async (subjects) => {
  const lessonsSnapshot = await lessonCollection.select('slug').get();
  const episodesSnapshot = await episodeCollection.select('videoId', 'premium', 'lessonId', 'title', 'index', 'seconds').get();

  const lessons = {};
  lessonsSnapshot.docs.forEach((lesson) => {
    lessons[lesson.id] = lesson.data().slug;
  });

  const episodes = {};
  episodesSnapshot.docs.forEach((episode) => {
    episodes[lessons[episode.data().lessonId] + episode.data().videoId] = {
      episodeId: episode.id,
      title: episode.data().title,
      seconds: episode.data().seconds,
      index: episode.data().index,
      premium: episode.data().premium,
    };
  });

  const data = lessonsData.map((item) => ({
    objectID: item.slug,
    title: item.title,
    slug: item.slug,
    description: item.description,
    seconds: calculateTotalSeconds(item.episodes),
    subjects: item.subjects.map((slug) => ({ slug: subjects[slug].slug, name: subjects[slug].name })),
    createdAt: item.createdAt,
    episodes: item.episodes.map((el) => episodes[item.slug + el.id]),
  }));

  const index = client.initIndex('lessons');
  await index.replaceAllObjects(data);
  console.log('Updated Algolia index');
};

const initLessons = async () => {
  try {
    const subjects = await fetchSubjects();

    for (const item of lessonsData) {
      const totalSeconds = calculateTotalSeconds(item.episodes);
      const lessonData = {
        title: item.title,
        slug: item.slug,
        description: item.description,
        seconds: totalSeconds,
        subjects: item.subjects.map((slug) => subjects[slug].id),
        createdAt: admin.firestore.Timestamp.fromDate(new Date(item.createdAt * 1000)),
      };

      const premiumRange = getRandomInt(0, item.episodes.length - 1);
      const lessonId = await updateLesson(lessonData);
      await initEpisodes(lessonId, item.episodes, premiumRange);
    }

    const lessonsSnapshot = await lessonCollection.select('slug').get();
    const xlessons = {};
    lessonsSnapshot.docs.forEach((lesson) => {
      xlessons[lesson.data().slug] = lesson.id;
    });

    await updateAlgoliaIndex(subjects);
    console.log('Initialization completed successfully.');
  } catch (error) {
    console.error('Failed to init lessons', error.message);
  }
};

export default initLessons;
