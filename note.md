npm install express
npm install -D @types/express

# 3. Install TypeScript toolchain
npm install -D typescript tsx @types/node

# 4. Install linting and formatting
npm install -D eslint @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser prettier eslint-config-prettier

# 5. Install dotenv for env vars
npm install dotenv
npm install -D @types/node

# 6. Create tsconfig
npx tsc --ini