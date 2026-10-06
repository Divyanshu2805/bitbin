import { ContentType } from '../src/generated/prisma/client'
import type { Prisma } from '../src/generated/prisma/client'

/**
 * The demo account's sample library: three collections and seventeen items
 * (snippets, prompts, commands and links). Used by the seed and by the daily
 * reset of the public demo account (`/api/cron/reset-demo`), so both put back
 * exactly the same content.
 */

/**
 * Replace everything the demo user has with the sample library, so whatever a
 * visitor added or changed is gone. Run it in a transaction: a half-finished
 * reset must not leave the demo account empty.
 */
export async function resetDemoContent(prisma: Prisma.TransactionClient, demoUserId: string) {
  const itemTypes = await prisma.itemType.findMany({ where: { isSystem: true } })
  const itemTypeMap: Record<string, string> = Object.fromEntries(itemTypes.map((t) => [t.name, t.id]))
  for (const name of ['snippet', 'prompt', 'command', 'link']) {
    if (!itemTypeMap[name]) throw new Error(`System item type "${name}" is missing; run the seed first`)
  }

  // Cascades remove the item-collection links and the item tag links
  await prisma.item.deleteMany({ where: { userId: demoUserId } })
  await prisma.collection.deleteMany({ where: { userId: demoUserId } })

  // ============================================
  // 3. CREATE COLLECTIONS
  // ============================================

  const reactPatternsCollection = await prisma.collection.create({
    data: {
      name: 'React Patterns',
      description: 'Reusable React patterns and hooks',
      userId: demoUserId,
      defaultTypeId: itemTypeMap['snippet'],
      isFavorite: true,
    },
  })

  const aiWorkflowsCollection = await prisma.collection.create({
    data: {
      name: 'AI Workflows',
      description: 'AI prompts and workflow automations',
      userId: demoUserId,
      defaultTypeId: itemTypeMap['prompt'],
      isFavorite: true,
    },
  })

  const devopsCollection = await prisma.collection.create({
    data: {
      name: 'DevOps',
      description: 'Infrastructure and deployment resources',
      userId: demoUserId,
    },
  })


  // ============================================
  // 4. CREATE ITEMS
  // ============================================

  // --- React Patterns (3 snippets) ---
  const useDebounceSnippet = await prisma.item.create({
    data: {
      title: 'useDebounce Hook',
      contentType: ContentType.TEXT,
      content: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
      description: 'A custom hook that debounces a value by a specified delay. Useful for search inputs and API calls.',
      language: 'typescript',
      userId: demoUserId,
      itemTypeId: itemTypeMap['snippet'],
      isPinned: true,
    },
  })

  const useLocalStorageSnippet = await prisma.item.create({
    data: {
      title: 'useLocalStorage Hook',
      contentType: ContentType.TEXT,
      content: `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}`,
      description: 'Persist state to localStorage with SSR support.',
      language: 'typescript',
      userId: demoUserId,
      itemTypeId: itemTypeMap['snippet'],
    },
  })

  const compoundComponentSnippet = await prisma.item.create({
    data: {
      title: 'Compound Component Pattern',
      contentType: ContentType.TEXT,
      content: `import { createContext, useContext, useState, ReactNode } from 'react';

interface AccordionContextType {
  openItems: string[];
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('useAccordion must be used within Accordion');
  return context;
}

interface AccordionProps {
  children: ReactNode;
  multiple?: boolean;
}

export function Accordion({ children, multiple = false }: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpenItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return multiple ? [...prev, id] : [id];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
}

Accordion.Item = function AccordionItem({ id, title, children }: AccordionItemProps) {
  const { openItems, toggle } = useAccordion();
  const isOpen = openItems.includes(id);

  return (
    <div className="accordion-item">
      <button onClick={() => toggle(id)}>{title}</button>
      {isOpen && <div className="accordion-content">{children}</div>}
    </div>
  );
};`,
      description: 'Flexible compound component pattern with context for building accessible UI components.',
      language: 'typescript',
      userId: demoUserId,
      itemTypeId: itemTypeMap['snippet'],
    },
  })

  // --- AI Workflows (3 prompts) ---
  const codeReviewPrompt = await prisma.item.create({
    data: {
      title: 'Code Review Assistant',
      contentType: ContentType.TEXT,
      content: `You are a senior software engineer performing a code review. Analyze the provided code and give feedback on:

1. **Code Quality**: Is the code clean, readable, and well-organized?
2. **Best Practices**: Does it follow language/framework conventions?
3. **Performance**: Are there any potential performance issues?
4. **Security**: Are there any security vulnerabilities?
5. **Testing**: Is the code testable? What tests would you recommend?

Format your response with specific line references and actionable suggestions. Be constructive and explain the reasoning behind each suggestion.

Code to review:
\`\`\`
{{code}}
\`\`\``,
      description: 'Comprehensive code review prompt for catching issues and improving code quality.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['prompt'],
      isFavorite: true,
    },
  })

  const docGenerationPrompt = await prisma.item.create({
    data: {
      title: 'Documentation Generator',
      contentType: ContentType.TEXT,
      content: `Generate comprehensive documentation for the following code. Include:

1. **Overview**: Brief description of what this code does
2. **Parameters/Props**: Document all inputs with types and descriptions
3. **Return Value**: What the function/component returns
4. **Usage Examples**: 2-3 practical examples showing how to use this
5. **Edge Cases**: Important edge cases or limitations to be aware of

Use JSDoc format for functions and markdown for components.

Code to document:
\`\`\`
{{code}}
\`\`\``,
      description: 'Generate JSDoc and markdown documentation from code.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['prompt'],
    },
  })

  const refactoringPrompt = await prisma.item.create({
    data: {
      title: 'Refactoring Assistant',
      contentType: ContentType.TEXT,
      content: `Analyze the following code and suggest refactoring improvements. Focus on:

1. **DRY Principle**: Identify repeated code that can be extracted
2. **Single Responsibility**: Functions/components doing too much
3. **Naming**: Variables, functions, or components with unclear names
4. **Complexity**: Simplify nested conditionals or complex logic
5. **Modern Patterns**: Suggest modern language features or patterns

For each suggestion:
- Show the original code
- Show the refactored version
- Explain the benefit

Code to refactor:
\`\`\`
{{code}}
\`\`\``,
      description: 'Get actionable refactoring suggestions with before/after examples.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['prompt'],
    },
  })

  // --- DevOps (1 snippet, 1 command, 2 links) ---
  const dockerComposeSnippet = await prisma.item.create({
    data: {
      title: 'Docker Compose - Node.js + PostgreSQL',
      contentType: ContentType.TEXT,
      content: `version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:`,
      description: 'Production-ready Docker Compose setup for Node.js applications with PostgreSQL.',
      language: 'yaml',
      userId: demoUserId,
      itemTypeId: itemTypeMap['snippet'],
    },
  })

  const deployCommand = await prisma.item.create({
    data: {
      title: 'Deploy to Production',
      contentType: ContentType.TEXT,
      content: `git pull origin main && npm ci && npm run build && pm2 restart all`,
      description: 'Quick deployment script: pull latest changes, install deps, build, and restart PM2 processes.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['command'],
    },
  })

  const dockerDocsLink = await prisma.item.create({
    data: {
      title: 'Docker Documentation',
      contentType: ContentType.URL,
      url: 'https://docs.docker.com/',
      description: 'Official Docker documentation - containers, images, compose, and more.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['link'],
    },
  })

  const githubActionsLink = await prisma.item.create({
    data: {
      title: 'GitHub Actions Documentation',
      contentType: ContentType.URL,
      url: 'https://docs.github.com/en/actions',
      description: 'CI/CD workflows with GitHub Actions - automate builds, tests, and deployments.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['link'],
    },
  })

  // --- Terminal Commands (4 commands) ---
  await prisma.item.create({
    data: {
      title: 'Git Undo Last Commit (Keep Changes)',
      contentType: ContentType.TEXT,
      content: `git reset --soft HEAD~1`,
      description: 'Undo the last commit but keep all changes staged. Perfect for fixing commit messages or adding forgotten files.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['command'],
      isPinned: true,
    },
  })

  await prisma.item.create({
    data: {
      title: 'Docker Cleanup',
      contentType: ContentType.TEXT,
      content: `docker system prune -af --volumes`,
      description: 'Remove all unused Docker resources: stopped containers, unused networks, dangling images, and volumes.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['command'],
    },
  })

  await prisma.item.create({
    data: {
      title: 'Kill Process on Port',
      contentType: ContentType.TEXT,
      content: `lsof -ti:3000 | xargs kill -9`,
      description: 'Find and kill any process running on port 3000. Change the port number as needed.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['command'],
    },
  })

  await prisma.item.create({
    data: {
      title: 'Check Outdated Packages',
      contentType: ContentType.TEXT,
      content: `npm outdated --long`,
      description: 'List all outdated npm packages with current, wanted, and latest versions plus package type.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['command'],
    },
  })

  // --- Design Resources (4 links) ---
  await prisma.item.create({
    data: {
      title: 'Tailwind CSS Documentation',
      contentType: ContentType.URL,
      url: 'https://tailwindcss.com/docs',
      description: 'Official Tailwind CSS docs - utility classes, configuration, and best practices.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['link'],
      isFavorite: true,
    },
  })

  await prisma.item.create({
    data: {
      title: 'shadcn/ui Components',
      contentType: ContentType.URL,
      url: 'https://ui.shadcn.com/',
      description: 'Beautiful, accessible components built with Radix UI and Tailwind CSS.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['link'],
    },
  })

  await prisma.item.create({
    data: {
      title: 'Radix UI Primitives',
      contentType: ContentType.URL,
      url: 'https://www.radix-ui.com/primitives',
      description: 'Unstyled, accessible UI primitives for building design systems.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['link'],
    },
  })

  await prisma.item.create({
    data: {
      title: 'Lucide Icons',
      contentType: ContentType.URL,
      url: 'https://lucide.dev/icons/',
      description: 'Beautiful, consistent open-source icons. Fork of Feather Icons with more icons.',
      userId: demoUserId,
      itemTypeId: itemTypeMap['link'],
    },
  })

  // ============================================
  // 5. LINK ITEMS TO COLLECTIONS
  // ============================================

  // React Patterns
  await prisma.itemCollection.createMany({
    data: [
      { itemId: useDebounceSnippet.id, collectionId: reactPatternsCollection.id },
      { itemId: useLocalStorageSnippet.id, collectionId: reactPatternsCollection.id },
      { itemId: compoundComponentSnippet.id, collectionId: reactPatternsCollection.id },
    ],
  })

  // AI Workflows
  await prisma.itemCollection.createMany({
    data: [
      { itemId: codeReviewPrompt.id, collectionId: aiWorkflowsCollection.id },
      { itemId: docGenerationPrompt.id, collectionId: aiWorkflowsCollection.id },
      { itemId: refactoringPrompt.id, collectionId: aiWorkflowsCollection.id },
    ],
  })

  // DevOps
  await prisma.itemCollection.createMany({
    data: [
      { itemId: dockerComposeSnippet.id, collectionId: devopsCollection.id },
      { itemId: deployCommand.id, collectionId: devopsCollection.id },
      { itemId: dockerDocsLink.id, collectionId: devopsCollection.id },
      { itemId: githubActionsLink.id, collectionId: devopsCollection.id },
    ],
  })
}
