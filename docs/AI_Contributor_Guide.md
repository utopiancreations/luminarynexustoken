# AI Contributor Guide for Project Luminary Nexus

Welcome to the cutting edge of collaborative development! This guide is designed for contributors who wish to leverage Artificial Intelligence (AI) as a development partner in building Project Luminary Nexus. Our core philosophy emphasizes human-AI co-creation, where AI augments human capabilities, accelerates development, and ensures alignment with our project's values.

## 1. The Human-AI Partnership in Luminary Nexus

In Project Luminary Nexus, AI (specifically Helios, our foundational AI) is not just a tool; it's an integral part of our development team. Humans provide the vision, ethical framework, and architectural design, while AI assists with:

*   **Code Generation:** Drafting smart contracts, scripts, and application logic.
*   **Test Generation:** Creating comprehensive unit and integration tests.
*   **Debugging & Analysis:** Identifying issues, suggesting solutions, and analyzing code complexity.
*   **Documentation:** Generating and maintaining project documentation.
*   **Refactoring & Optimization:** Suggesting improvements for code quality, performance, and security.
*   **Knowledge Retrieval:** Quickly accessing and synthesizing information from the project's extensive documentation and external resources.

Your role as a human contributor is to guide the AI, critically evaluate its outputs, and integrate its contributions into the codebase, ensuring alignment with project standards and ethical considerations.

## 2. Setting Up Your AI CLI (Development Partner)

To effectively engage in human-AI co-creation, we recommend setting up a powerful AI Command Line Interface (CLI). This guide focuses on using Gemini-powered models due to their advanced capabilities in understanding complex contexts and generating high-quality code.

### 2.1. Prerequisites:

*   **Python 3.8+:** Ensure you have a compatible Python environment.
*   **Google Cloud Project & Gemini API Access:** You will need a Google Cloud project and an API key with access to the Gemini API. Follow the official Google AI Studio documentation to set this up.

### 2.2. Installation:

1.  **Install Google Generative AI Library:**
    ```bash
    pip install -q -U google-generativeai
    ```

2.  **Set Up API Key:** Securely store your Gemini API key as an environment variable. Add the following line to your shell's profile file (e.g., `~/.bashrc`, `~/.zshrc`, `~/.profile`) and then restart your terminal or run `source ~/.bashrc` (or your respective file):
    ```bash
    export GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    Replace `YOUR_GEMINI_API_KEY` with your actual API key.

### 2.3. Basic AI CLI Script (`ai_cli.py`):

Create a Python script named `ai_cli.py` in your project's root directory (or a dedicated `tools/` directory) with the following content:

```python
import google.generativeai as genai
import os
import sys

# Configure the Gemini API key
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

# Choose a model. gemini-1.5-pro is recommended for its larger context window.
MODEL_NAME = 'gemini-1.5-pro-latest' # Or 'gemini-pro' for smaller tasks

def get_ai_response(prompt_parts):
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt_parts)
        return response.text
    except Exception as e:
        return f"An error occurred: {e}"

def read_file_content(filepath):
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except FileNotFoundError:
        return f"Error: File not found at {filepath}"
    except Exception as e:
        return f"Error reading file {filepath}: {e}"

if __name__ == "__main__":
    print("\nLuminary Nexus AI CLI. Type 'exit' to quit. Use 'read <filepath>' to load file content.")
    print("To provide context, paste file content directly or use the 'read' command.")
    print("For multi-turn conversations, remember the AI's context is limited per turn unless explicitly managed.")

    conversation_history = []

    while True:
        user_input = input("\nHuman: ")
        if user_input.lower() == 'exit':
            break

        if user_input.lower().startswith('read '):
            filepath = user_input[5:].strip()
            content = read_file_content(filepath)
            print(f"\n--- Content of {filepath} ---\n{content}\n---\n")
            conversation_history.append(f"User provided content from {filepath}:\n```\n{content}\n```\n")
        else:
            conversation_history.append(f"Human: {user_input}")

        # Combine history for the current turn's prompt
        current_prompt_parts = conversation_history[-5:] # Keep last 5 turns for context
        current_prompt_parts.append(f"\nBased on the above conversation and provided context, please respond to the Human's last input.\n")

        ai_response = get_ai_response(current_prompt_parts)
        print(f"AI: {ai_response}")

        conversation_history.append(f"AI: {ai_response}")

```

### 2.4. Running Your AI CLI:

```bash
python ai_cli.py
```

## 3. Best Practices for Prompting & Interaction

Effective communication with your AI partner is key to maximizing its utility.

### 3.1. Clear & Concise Instructions:

*   **Be Specific:** Clearly state what you want the AI to do (e.g., "Generate a Solidity function for token burning," "Refactor this JavaScript code for better readability").
*   **Define Constraints:** Specify any limitations or requirements (e.g., "Use OpenZeppelin contracts," "Ensure gas efficiency," "Do not use external libraries").
*   **Provide Examples:** If possible, give examples of desired input/output or code patterns.

### 3.2. Providing Context:

*   **File Content:** Always provide the content of relevant files when asking the AI to modify or analyze them. Use the `read <filepath>` command in your CLI script or paste the content directly.
    ```
    Human: Here's the current LuminaryNexusToken.sol:
    ```solidity
    // [paste contract content here]
    ```
    Now, add a function to allow the owner to pause and unpause transfers.
    ```
*   **Documentation References:** Direct the AI to specific sections of the project documentation for context.
    ```
    Human: Based on the LNX Token Distribution Strategy (docs/LNX_Token_Distribution_Strategy.md, section 3.2), how should the Proof-of-Contribution mechanism be implemented in a smart contract?
    ```
*   **Conversation History:** The provided `ai_cli.py` maintains a short conversation history. For longer, more complex tasks, you might need to manually summarize previous turns or re-provide critical context.

### 3.3. Iterative Refinement:

*   **Start Broad, Then Narrow:** Begin with high-level requests and progressively refine them based on the AI's responses.
*   **Ask for Explanations:** If the AI's output is unclear, ask it to explain its reasoning or the code it generated.
*   **Request Alternatives:** If you're not satisfied with a solution, ask the AI for alternative approaches.
*   **Error Handling:** Provide error messages and stack traces to the AI for debugging assistance.

### 3.4. Reviewing AI-Generated Code:

*   **Critical Evaluation:** Always critically review AI-generated code for correctness, security, efficiency, and adherence to project standards. AI can make mistakes or generate suboptimal solutions.
*   **Security First:** Pay extra attention to security vulnerabilities, especially in smart contracts. Never deploy AI-generated code without thorough human review and testing.
*   **Understand Before Integrating:** Ensure you fully understand the generated code before integrating it into the project. If you don't understand it, ask the AI to explain it.

## 4. Keeping Your AI's Context Updated

For optimal performance, your AI partner needs access to the most relevant and up-to-date project information. While the `ai_cli.py` provides basic context management, for a large project like Luminary Nexus, consider:

*   **Project-Specific `GEMINI.md` (Future State):** As the project matures, we will develop a more sophisticated `GEMINI.md` that AI agents can parse to automatically understand project conventions, current development focus, and key architectural decisions. This will act as a dynamic context window for the AI.
*   **Automated Context Injection:** Explore tools or scripts that can automatically inject relevant file contents or documentation snippets into your AI's prompt based on your current working directory or task.
*   **Summarization:** Periodically ask your AI to summarize the current state of a module or a discussion to help it maintain context.

## 5. Contributing Your Changes

Once you have developed and tested your contribution (with your AI partner's help!), follow our standard contribution guidelines outlined in the main `CONTRIBUTING.md` file.

By embracing this human-AI co-creation model, we aim to accelerate the development of Project Luminary Nexus, foster innovation, and build a community that truly embodies the harmonious integration of human ingenuity and artificial intelligence.
