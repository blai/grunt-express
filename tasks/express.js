'use strict';

var util = require('../lib/util');

module.exports = function(grunt) {

	// Nodejs libs.

	// External libs.
	var nopt = require('nopt');
	var supervisor = require('supervisor');

	grunt.registerMultiTask('express', 'Start an express web server.', function() {
		// Merge task-specific options with these defaults.
		var options = this.options({
			port: 3000,
			hostname: 'localhost',
			bases: '.', // string|array of each static folders
			keepalive: false,
			supervisor: false,
			// supervisor: {
			// watch: ['.'],
			// ignore: null,
			// pollInterval: null,
			// extensions: null,
			// noRestartOn: 'error'
			// },
			debug: false,
			server: null
			// (optional) filepath that points to a module that exports a 'server' object that provides
			// 1. a 'listen' function act like http.Server.listen (which connect.listen does)
			// 2. a 'use' function act like connect.use
		});

		options.keepalive = this.flags.keepalive || options.keepalive;
		options.debug = grunt.option('debug') || options.debug;
			
		if (options.supervisor) {
			var args = [];
			
			util.parseSupervisorOpt(options.supervisor, args);
			delete options.supervisor;

			args = args.concat(['--', process.argv[1], '_express_']);

			grunt.util._.each(options, function(value, key) {
				if (grunt.util._.isArray(value)) {
					value = value.join(',');
				} else {
					value = String(value);
				}
				args = args.concat('--' + key, value);
			});

			if (!options.debug) {
				args.unshift('--quiet');
			} else {
				args.unshift('--debug');
			}
			supervisor.run(args);
		} else {
			util.runServer(grunt, options, this.async);
		}
	});

	grunt.registerTask('_express_', 'Child process to start a connect server', function() {
		util.watchActiveModules(function(oldStat, newStat) {
			if (newStat.mtime.getTime() !== oldStat.mtime.getTime()) {
				process.exit(0);
			}
		});

		var options = nopt({
			port: Number,
			hostname: String,
			bases: String,
			keepalive: Boolean,
			debug: Boolean,
			server: [String, null]
		}, {
			port: ['--port'],
			hostname: ['--hostname'],
			bases: ['--bases'],
			keepalive: ['--keepalive'],
			debug: ['--debug'],
			server: ['--server']
		}, process.argv, 3);

		util.runServer(grunt, options, this.async);
	});
};