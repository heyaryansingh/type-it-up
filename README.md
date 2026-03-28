# Type-It-Up 🚀

**Type-It-Up** is a high-performance, professional-grade tool designed to convert handwritten notes, mathematical equations, and technical diagrams into clean, compilable **LaTeX**, **Markdown**, and **PDF** formats.

Leveraging advanced AI vision models (Llama 3 Vision via Groq), Type-It-Up understands complex scientific notation and can even generate **TikZ code** for diagrams, graphs, and geometric shapes.

![App Screenshot](https://raw.githubusercontent.com/heyaryansingh/type-it-up/main/public/screenshot.png)

## ✨ Key Features

- 📑 **Comprehensive OCR**: Extracts text from handwritten and printed documents with high accuracy.
- ➗ **Mathematical LaTeX**: Converts complex formulas, integrals, and matrices into proper LaTeX syntax.
- 📐 **Diagram-to-TikZ**: Automatically converts standard diagrams (graphs, circuits, Venn diagrams) into editable TikZ code.
- ⚛️ **Scientific Notation**: Native support for Quantum Mechanics (Bra-Ket), Physics, and Engineering notation.
- 📤 **Professional Exports**:
  - **LaTeX**: Full source code with standard package configurations.
  - **Overleaf ZIP**: Ready-to-upload package for cloud-based LaTeX editing.
  - **Markdown**: Clean MD with math blocks for easy integration into notes.
  - **PDF**: Direct export of processed documents.
- 🎨 **Sleek UI**: A minimal, professional interface with Dark/Light mode support.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, KaTeX.
- **Backend API**: Next.js API Routes (Edge-ready).
- **AI Engine**: Groq Vision (Llama 3 11B/90B) for high-speed document analysis.
- **Export Services**: JSZip, jsPDF, html2canvas.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn.
- A **Groq API Key** (Get one at [console.groq.com](https://console.groq.com)).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/heyaryansingh/type-it-up.git
   cd type-it-up
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env.local` file in the root directory:
   ```env
   GROQ_API_KEY=your_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 How to Use

1. **Upload**: Drag and drop an image or PDF of your handwritten notes.
2. **Review**: Check the live preview to see detected text and math.
3. **Format**: Toggle between LaTeX, Markdown, and Raw data views.
4. **Export**: Use the Action Bar to download your desired format or copy specific snippets.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by [Aryan Singh](https://github.com/heyaryansingh)
