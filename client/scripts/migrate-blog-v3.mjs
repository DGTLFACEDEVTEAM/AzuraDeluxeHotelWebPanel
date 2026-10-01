import {migrateBlog,restoreBlogMigration,migrationRoots} from '../lib/azura-blog-migration.mjs';
let resolved;
const args=process.argv.slice(2),options={};
try{
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--apply')options.apply=true;
  else if(arg==='--maintenance-confirmed')options.maintenance=true;
  else if(arg==='--dry-run')options.dryRun=true;
  else if(arg==='--restore'||arg==='--verify-backup'){if(options.run)throw new Error('Tek kurtarma seçeneği kullanın.');options.verifyOnly=arg==='--verify-backup';if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('--restore dizini gerekli.');options.run=args[++i];}
  else throw new Error('Bilinmeyen migration seçeneği.');
 }
 if(options.apply&&options.dryRun)throw new Error('--dry-run ve --apply birlikte kullanılamaz.');
 resolved=await migrationRoots();
 const result=await (options.run?restoreBlogMigration(options):migrateBlog(options));
 console.log(JSON.stringify(result,null,2));
}catch(error){
 console.error(JSON.stringify({...resolved,errors:[error.message],recoveryDirectory:error.recoveryDirectory,migrationLock:error.migrationLock},null,2));process.exitCode=1;
}
