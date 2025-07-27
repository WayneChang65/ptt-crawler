// Original from below site
// https://github.com/sindresorhus/is-docker/issues/13

import fs from 'fs';

let isDockerCached : undefined | boolean;

function hasDockerEnv() : boolean {
    try {
        fs.statSync('/.dockerenv');
        return true;
    } catch {
        return false;
    }
}

function hasDockerCGroup() : boolean {
    try {
        return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
    } catch {
        return false;
    }
}

export const isDocker = () => {
	if (isDockerCached === undefined) {
		isDockerCached = hasDockerEnv() || hasDockerCGroup();
	}
	return isDockerCached;
};
