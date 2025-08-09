import { prisma } from '../src/db/index.js';
import { initializeSystemUsers } from '../src/utils/systemUsers.js';

console.log('Starting improved seed...');

const commonIllnesses = [
	// Autoimmune
	{ name: 'Rheumatoid Arthritis', category: 'autoimmune', description: 'Chronic inflammatory disorder affecting joints' },
	{ name: 'Type 1 Diabetes', category: 'autoimmune', description: 'Autoimmune condition affecting insulin production' },
	{ name: 'Multiple Sclerosis', category: 'autoimmune', description: 'Disease affecting the central nervous system' },
	{ name: 'Lupus', category: 'autoimmune', description: 'Chronic autoimmune disease affecting multiple organs' },
	{ name: 'Celiac Disease', category: 'autoimmune', description: 'Autoimmune reaction to gluten' },
	
	// Mental Health
	{ name: 'Depression', category: 'mental_health', description: 'Persistent feeling of sadness and loss of interest' },
	{ name: 'Anxiety Disorder', category: 'mental_health', description: 'Excessive worry and fear' },
	{ name: 'Bipolar Disorder', category: 'mental_health', description: 'Mood disorder with extreme highs and lows' },
	{ name: 'PTSD', category: 'mental_health', description: 'Post-traumatic stress disorder' },
	{ name: 'OCD', category: 'mental_health', description: 'Obsessive-compulsive disorder' },
	
	// Chronic Pain
	{ name: 'Fibromyalgia', category: 'chronic_pain', description: 'Chronic widespread musculoskeletal pain' },
	{ name: 'Chronic Fatigue Syndrome', category: 'chronic_pain', description: 'Extreme fatigue that doesn\'t improve with rest' },
	{ name: 'Endometriosis', category: 'chronic_pain', description: 'Tissue similar to uterine lining grows outside uterus' },
	{ name: 'Migraine', category: 'chronic_pain', description: 'Severe recurring headaches' },
	
	// Cardiovascular
	{ name: 'Heart Disease', category: 'cardiovascular', description: 'Various conditions affecting the heart' },
	{ name: 'Hypertension', category: 'cardiovascular', description: 'High blood pressure' },
	{ name: 'Arrhythmia', category: 'cardiovascular', description: 'Irregular heartbeat' },
	
	// Respiratory
	{ name: 'Asthma', category: 'respiratory', description: 'Airways become inflamed and narrowed' },
	{ name: 'COPD', category: 'respiratory', description: 'Chronic obstructive pulmonary disease' },
	{ name: 'Cystic Fibrosis', category: 'respiratory', description: 'Genetic disorder affecting lungs and digestive system' },
	
	// Neurological
	{ name: 'Epilepsy', category: 'neurological', description: 'Neurological disorder characterized by seizures' },
	{ name: 'Parkinson\'s Disease', category: 'neurological', description: 'Progressive nervous system disorder' },
	{ name: 'Alzheimer\'s Disease', category: 'neurological', description: 'Progressive brain disorder affecting memory' },
	
	// Digestive
	{ name: 'Crohn\'s Disease', category: 'digestive', description: 'Inflammatory bowel disease' },
	{ name: 'Ulcerative Colitis', category: 'digestive', description: 'Inflammatory bowel disease affecting colon' },
	{ name: 'IBS', category: 'digestive', description: 'Irritable bowel syndrome' },
	
	// Endocrine
	{ name: 'Type 2 Diabetes', category: 'endocrine', description: 'Metabolic disorder with high blood sugar' },
	{ name: 'Hypothyroidism', category: 'endocrine', description: 'Underactive thyroid gland' },
	{ name: 'Hyperthyroidism', category: 'endocrine', description: 'Overactive thyroid gland' },
	
	// Musculoskeletal
	{ name: 'Osteoarthritis', category: 'musculoskeletal', description: 'Joint disease due to cartilage breakdown' },
	{ name: 'Osteoporosis', category: 'musculoskeletal', description: 'Bone density loss' },
	{ name: 'Scoliosis', category: 'musculoskeletal', description: 'Sideways curvature of the spine' },
	
	// Other
	{ name: 'Chronic Kidney Disease', category: 'other', description: 'Gradual loss of kidney function' },
	{ name: 'Cancer (Various)', category: 'oncological', description: 'Various types of cancer' },
	{ name: 'HIV/AIDS', category: 'infectious', description: 'Human immunodeficiency virus' }
];

async function seedDatabase() {
	try {
		console.log('🌱 Starting database seeding...');
		
		// 1. Initialize system users
		console.log('👤 Initializing system users...');
		await initializeSystemUsers();
		console.log('✅ System users initialized');

		// 2. Seed illnesses
		console.log('🏥 Seeding illnesses...');
		
		let seedCount = 0;
		for (const illness of commonIllnesses) {
			await prisma.illness.upsert({
				where: { name: illness.name },
				update: illness,
				create: illness
			});
			seedCount++;
			if (seedCount % 5 === 0) {
				console.log(`   ✅ Seeded ${seedCount}/${commonIllnesses.length} illnesses...`);
			}
		}

		console.log(`✅ Seeded ${seedCount} illnesses total`);

		// Show final stats
		const illnessCount = await prisma.illness.count();
		const userCount = await prisma.user.count();
		
		console.log('📊 Database Summary:');
		console.log(`   - Illnesses: ${illnessCount}`);
		console.log(`   - Users: ${userCount}`);

	} catch (error) {
		console.error('❌ Error seeding database:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
		console.log('👋 Database disconnected');
	}
}

seedDatabase()
	.then(() => {
		console.log('🎉 Seeding completed!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('💥 Seeding failed:', error);
		process.exit(1);
	});
