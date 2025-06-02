
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const OpenAI = require("openai");

app.use(bodyParser.json({ limit: '5mb' }));

const openai = new OpenAI({
  apiKey: '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' // Replace with your actual key
});

const CHUNK_SIZE = 400;

function chunkLines(codeLines, size) {
  const chunks = [];
  for (let i = 0; i < codeLines.length; i += size) {
    chunks.push(codeLines.slice(i, i + size));
  }
  return chunks;
}

function createPrompt(chunkLines, startLine) {
  const numberedCode = chunkLines.map((line, idx) => `${startLine + idx}: ${line}`).join("\n");
  return `### Important Reminders for the Review:

- ❗ 'Test(params) and 'Test' is mandatory Rapise boilerplate.  
  Do **not** comment on its size, complexity, or lack of comments.  
  Ignore all critique or suggestions related to this function.

- The array g_load_libraries = ["Web"]; is a standard Rapise boilerplate declaration at the end of the script.  
  **Do not flag its position or usage as an issue**.

- XPath expressions may be hardcoded or indexed intentionally (e.g., '//table/tr[3]/td[2]') due to UI structure or lack of stable attributes:  
  ✅ Accept justified use of **indexed** or **manipulated** XPath if dynamic handling is not feasible.  
  ⚠️ Flag overly brittle or fragile XPath and suggest better alternatives (e.g., 'contains()', 'normalize-space()', stable attributes).

- When a function call has no visible definition in this snippet, consider that it may be imported or defined elsewhere.  
  Do **not** report missing function errors for such cases unless there is strong evidence they are undefined.

- When functions are called without parameters, assume this is intentional unless there is clear evidence that parameters are required.  
  Do **not** flag missing parameters unless the function definition is visible and requires parameters.

- String parameters representing user types (e.g., 'Individual_User', 'Admin') are used intentionally to select credentials, roles, or configurations.  
  Do **not** flag these as hardcoded literals needing replacement unless there is clear evidence this harms maintainability or flexibility.

- For UI actions like SeS('element').DoClick(), suggest error handling **only if failure to find or click the element would cause test failure or break flow**.  
  If the element is optionally present or invisibility is expected, do **not** flag missing error handling as a critical issue.

---

You are a Senior QA Automation Expert with deep expertise in Rapise, JavaScript, and best practices for automated testing frameworks.

🧠 Please review the following Rapise test script or object definition.

---

📌 Your responsibilities:

1. **Understand the purpose of each function** based on its structure, name, and internal logic.
2. Identify and explain any **bugs, risky or inefficient practices**, or anti-patterns.
3. Evaluate each function or block for:
   - Code structure and logic clarity
   - Naming conventions
   - Variable declarations and scope
   - Maintainability and readability
   - Robustness and accuracy of XPath locators
   - Presence and clarity of comments
4. Provide clear, actionable suggestions for improvements or refactors.

---

Respond using this structured format:

**Issues Found (Lines ${startLine}–${startLine + chunkLines.length - 1}):**

- Line X[, Y...]: [Description of the issue]  
  **Suggestions for Improvement:**  
  - [Specific fix or refactor]

**Overall Assessment (Lines ${startLine}–${startLine + chunkLines.length - 1}):**  
[Evaluation of this portion of the script.]

Here is the code snippet (with line numbers):

\`\`\`
${numberedCode}
\`\`\``;
}



app.post('/api/review', async (req, res) => {
  try {
    const code = req.body.model_input.code || '';
    const lines = code.split("\n");
    const chunks = chunkLines(lines, CHUNK_SIZE);

    const responses = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prompt = createPrompt(chunk, i * CHUNK_SIZE + 1);

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0,
        messages: [{ role: "user", content: prompt }]
      });

      responses.push(`### Review for Lines ${i * CHUNK_SIZE + 1}-${i * CHUNK_SIZE + chunk.length}

${completion.choices[0].message.content}`);
    }

    res.json({
      model_output: {
        summary: responses.join("\n\n")
      }
    });
  } catch (error) {
    console.error("Error during chunked review:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

app.listen(3001, () => console.log('✅ MCP Review Agent with chunked analysis running on port 3001'));
