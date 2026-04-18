// const fs = require('fs');

// const path = "d:\\Studyyyy\\Do_an\\FAMS\\fams-project\\frontend\\src\\pages\\lecturer\\LecturerAssignmentDetailPage.tsx";
// let content = fs.readFileSync(path, 'utf8');

// // The faulty start:
// // 174:     if (loading) {
// // 175:             return (
// // 176:         <LecturerLayout pageTitle="Chi tiết bài tập">

// const faultyStartPattern = 'if (loading) {\n            return (\n        <LecturerLayout pageTitle="Chi tiết bài tập">';
// const correctStart = `    if (loading) {
//         return (
//             <LecturerLayout pageTitle="Chi tiết bài tập">
//                 <div className="flex items-center justify-center min-h-[400px]">
//                     <Loader2 size={32} className="animate-spin text-fpt-orange" />
//                 </div>
//             </LecturerLayout>
//         );
//     }

//     return (
//         <LecturerLayout pageTitle="Chi tiết bài tập">`;

// if (content.includes('if (loading) {\n            return (')) {
//     content = content.replace('if (loading) {\n            return (\n        <LecturerLayout pageTitle="Chi tiết bài tập">', correctStart);
//     fs.writeFileSync(path, content, 'utf8');
//     console.log("Successfully replaced");
// } else {
//     // Try with different line endings if the above fails
//     console.log("Pattern not found. Checking content around expected area.");
//     const lines = content.split('\n');
//     for (let i = 170; i < 180 && i < lines.length; i++) {
//         console.log(\`line \${i+1}: [\${lines[i]}]\`);
//     }
// }
