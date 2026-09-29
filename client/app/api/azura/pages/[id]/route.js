import {dynamicPagesHandler} from '@/lib/azura-dynamic-pages-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=dynamicPagesHandler('get');
export const PUT=dynamicPagesHandler('update');
export const DELETE=dynamicPagesHandler('delete');
