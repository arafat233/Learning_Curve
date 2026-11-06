const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function run(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status !== 0) {
    throw new Error(`${name} failed\n${output}`);
  }
  console.log(`${name}: ${output || 'ok'}`);
}

function commandPath(command) {
  const result = spawnSync('where.exe', [command], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : '';
}

function findMsvcVcvars() {
  const roots = [
    'C:\\Program Files\\Microsoft Visual Studio',
    'C:\\Program Files (x86)\\Microsoft Visual Studio',
  ];
  const found = [];
  const visit = (dir, depth = 0) => {
    if (depth > 8 || found.length) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === 'vcvars64.bat') {
        found.push(full);
        return;
      }
      if (entry.isDirectory()) visit(full, depth + 1);
      if (found.length) return;
    }
  };
  roots.forEach(root => visit(root));
  return found[0] || '';
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-interview-runtime-'));

const ts = require('typescript');
const js = ts.transpileModule('const x: number = 42; console.log(x);', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
fs.writeFileSync(path.join(dir, 'ts-smoke.js'), js);
run('typescript', 'node', ['ts-smoke.js'], { cwd: dir });

if (commandPath('javac.exe')) {
  fs.writeFileSync(path.join(dir, 'Main.java'), 'public class Main { public static void main(String[] args) { System.out.println(42); } }');
  run('java', 'cmd', ['/d', '/s', '/c', 'javac Main.java && java Main'], { cwd: dir });
} else {
  console.log('java: skipped, javac not found');
}

if (commandPath('go.exe')) {
  fs.writeFileSync(path.join(dir, 'main.go'), 'package main\nimport "fmt"\nfunc main(){ fmt.Println(42) }\n');
  run('go', 'go', ['run', 'main.go'], { cwd: dir });
} else {
  console.log('go: skipped, go not found');
}

fs.writeFileSync(path.join(dir, 'solution.cpp'), '#include <iostream>\nint main(){ std::cout << 42 << std::endl; return 0; }\n');
if (commandPath('g++.exe')) {
  run('cpp-g++', 'cmd', ['/d', '/s', '/c', 'g++ solution.cpp -std=c++17 -O2 -o solution.exe && .\\solution.exe'], { cwd: dir });
} else if (commandPath('clang++.exe')) {
  run('cpp-clang', 'cmd', ['/d', '/s', '/c', 'clang++ solution.cpp -std=c++17 -O2 -o solution.exe && .\\solution.exe'], { cwd: dir });
} else {
  const vcvars = findMsvcVcvars();
  if (!vcvars) throw new Error('No C++ compiler found: g++, clang++, and MSVC vcvars64.bat are unavailable.');
  fs.writeFileSync(path.join(dir, 'run-msvc.bat'), [
    '@echo off',
    `call "${vcvars}" >nul`,
    'if errorlevel 1 exit /b %errorlevel%',
    'cl /nologo /EHsc /std:c++17 solution.cpp /Fe:solution.exe',
    'if errorlevel 1 exit /b %errorlevel%',
    '.\\solution.exe',
  ].join('\r\n'));
  run('cpp-msvc', 'cmd', ['/d', '/c', '.\\run-msvc.bat'], { cwd: dir });
}

console.log('Runtime smoke test passed.');
