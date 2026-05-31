import type { ParamMatcher } from '@sveltejs/kit';
import { AK_COURSES } from '$lib/courses';

const slugs = new Set(AK_COURSES.map((c) => c.routeSlug));

export const match: ParamMatcher = (param) => slugs.has(param);
