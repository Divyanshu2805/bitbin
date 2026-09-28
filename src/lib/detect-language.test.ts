import { describe, it, expect } from 'vitest';
import { detectLanguage } from './detect-language';
import { LANGUAGES } from '@/lib/constants/editor';

const SAMPLES: Record<string, string> = {
  javascript: `const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};
module.exports = debounce;`,
  typescript: `export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}`,
  python: `import os

def read_config(path: str) -> dict:
    with open(path) as f:
        return json.load(f)

if __name__ == "__main__":
    print(read_config(os.environ["CONFIG"]))`,
  go: `package main

import "fmt"

func main() {
	name := "world"
	fmt.Println("hello", name)
}`,
  rust: `fn main() {
    let mut total = 0;
    for n in 1..=10 {
        total += n;
    }
    println!("{}", total);
}`,
  java: `public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}`,
  csharp: `using System;

public class Greeter
{
    public string Name { get; set; }
    public void Greet() => Console.WriteLine($"Hi {Name}");
}`,
  cpp: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3};
    for (auto n : v) std::cout << n << "\\n";
}`,
  c: `#include <stdio.h>

int main(void) {
    printf("hello\\n");
    return 0;
}`,
  php: `<?php
function greet($name) {
    echo "Hello, $name";
}`,
  ruby: `require 'json'

class Greeter
  attr_reader :name

  def greet
    puts "Hello #{name}"
  end
end`,
  kotlin: `data class User(val name: String, val age: Int)

fun main() {
    val user = User("Ada", 36)
    println(user)
}`,
  swift: `import SwiftUI

struct ContentView: View {
    var body: some View {
        Text("Hello")
    }
}`,
  dart: `import 'package:flutter/material.dart';

class App extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Text('hi');
}`,
  lua: `local function greet(name)
  if name ~= nil then
    print("hi " .. name)
  end
end`,
  sql: `SELECT u.id, u.email, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id;`,
  graphql: `query GetUser($id: ID!) {
  user(id: $id) {
    name
    email
  }
}`,
  bash: `#!/bin/bash
for f in *.log; do
  gzip "$f"
done`,
  powershell: `Get-ChildItem -Path . -Recurse | Where-Object { $_.Length -gt 1MB }`,
  dockerfile: `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
CMD ["node", "server.js"]`,
  html: `<!DOCTYPE html>
<html>
  <body><p>Hello</p></body>
</html>`,
  css: `.card {
  display: flex;
  padding: 1rem;
}

@media (max-width: 600px) {
  .card { padding: 0.5rem; }
}`,
  scss: `$primary: #0af;

.button {
  color: $primary;
  &:hover { color: darken($primary, 10%); }
}`,
  yaml: `name: ci
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest`,
  json: `{
  "name": "bitbin",
  "private": true
}`,
  markdown: `# Setup

- Install dependencies
- Run the [dev server](http://localhost:3000)

\`\`\`bash
npm run dev
\`\`\``,
};

describe('detectLanguage', () => {
  it.each(Object.entries(SAMPLES))('detects %s', (language, sample) => {
    expect(detectLanguage(sample, 'snippet')).toBe(language);
  });

  it('only returns values the language picker knows', () => {
    const known = new Set(LANGUAGES.map((l) => l.value));
    for (const sample of Object.values(SAMPLES)) {
      const detected = detectLanguage(sample);
      if (detected) expect(known.has(detected)).toBe(true);
    }
  });

  it('returns null for empty or whitespace content', () => {
    expect(detectLanguage('')).toBeNull();
    expect(detectLanguage('   \n  ')).toBeNull();
  });

  it('returns null for prose it cannot place', () => {
    expect(detectLanguage('remember to rotate the keys before friday', 'snippet')).toBeNull();
  });

  it.each([
    ['git log --oneline --graph', 'bash'],
    ['docker compose up -d && docker compose logs -f api', 'bash'],
    ['kubectl get pods -n prod | grep api', 'bash'],
    ['Get-Process | Stop-Process -Name node', 'powershell'],
    ['SELECT * FROM users WHERE email = $1;', 'sql'],
  ])('detects the command %s as %s', (command, language) => {
    expect(detectLanguage(command, 'command')).toBe(language);
  });

  it('falls back to bash for a command it cannot place', () => {
    expect(detectLanguage('terraform apply', 'command')).toBe('bash');
  });

  it('prefers TypeScript over JavaScript when types are present', () => {
    expect(detectLanguage('const add = (a: number, b: number): number => a + b;')).toBe('typescript');
    expect(detectLanguage('const add = (a, b) => a + b;')).toBe('javascript');
    expect(detectLanguage('const counts: Record<string, number> = {};')).toBe('typescript');
  });

  it('treats JSX as JavaScript, not HTML', () => {
    expect(
      detectLanguage(`export default function Card({ title }) {
  return (
    <div className="card"><h2>{title}</h2></div>
  );
}`)
    ).toBe('javascript');
  });
});
