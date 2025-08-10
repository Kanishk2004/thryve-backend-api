#!/usr/bin/env node

/**
 * Quick Test Users Generator
 * 
 * This script provides a simple CLI interface to generate test users
 * without needing to authenticate or use the API endpoints.
 */

import { TestUsersController } from '../src/controllers/admin/testUsers.controller.js';

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	
	console.log('🧪 Test Users Management CLI\n');

	switch (command) {
		case 'generate':
			const count = parseInt(args[1]) || 5;
			console.log(`Generating ${count} test users...`);
			
			// Mock request/response objects
			const req = { body: { count } };
			const res = {
				status: (code) => ({ json: (data) => console.log(`Status: ${code}`, JSON.stringify(data, null, 2)) }),
				json: (data) => console.log(JSON.stringify(data, null, 2))
			};

			try {
				await TestUsersController.generateTestUsers(req, res);
			} catch (error) {
				console.error('Error:', error.message);
			}
			break;

		case 'stats':
			console.log('Getting test users statistics...');
			
			const statsReq = { body: {} };
			const statsRes = {
				status: (code) => ({ json: (data) => console.log(`Status: ${code}`, JSON.stringify(data, null, 2)) }),
				json: (data) => console.log(JSON.stringify(data, null, 2))
			};

			try {
				await TestUsersController.getTestUsersStats(statsReq, statsRes);
			} catch (error) {
				console.error('Error:', error.message);
			}
			break;

		case 'clear':
			console.log('Clearing all test users...');
			
			const clearReq = { body: {} };
			const clearRes = {
				status: (code) => ({ json: (data) => console.log(`Status: ${code}`, JSON.stringify(data, null, 2)) }),
				json: (data) => console.log(JSON.stringify(data, null, 2))
			};

			try {
				await TestUsersController.clearTestUsers(clearReq, clearRes);
			} catch (error) {
				console.error('Error:', error.message);
			}
			break;

		default:
			console.log('Available commands:');
			console.log('  generate [count]  - Generate test users (default: 5, max: 50)');
			console.log('  stats            - Show test users statistics');
			console.log('  clear            - Clear all test users');
			console.log('');
			console.log('Examples:');
			console.log('  npm run test-users generate 10');
			console.log('  npm run test-users stats');
			console.log('  npm run test-users clear');
			process.exit(1);
	}
}

main().catch(console.error);
