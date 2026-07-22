-- Keep LeetCode's public language usage separate from GitHub repository languages.
ALTER TABLE "Profile"
ADD COLUMN "leetcodeLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
