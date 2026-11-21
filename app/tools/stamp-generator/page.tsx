import type { Metadata } from "next";
import StampGenerator from "./StampGenerator";
import ToolBreadcrumb from "../ToolBreadcrumb";

export const metadata: Metadata = {
  title: "Free Digital Stamp Generator (GoodNotes & Notability) | ToolsAB",
  description: "Create custom transparent PNG stamps for digital planning. Free, no sign-up, and 100% private. Works perfectly with GoodNotes, Notability, and iPad planning apps.",
};

export default function StampGeneratorPage() {
  return (
    <article className="animate-fade-in">
      <ToolBreadcrumb title="Digital Stamp Generator" />

      {/* The Tool */}
      <StampGenerator />

      <header className="tool-page-header">
        <p className="tool-page-category">Digital planning</p>
        <h1>Free Custom Digital Stamp Generator</h1>
        <p>
          Create transparent PNG stamps for GoodNotes, Notability, and digital planning. 
          No sign-up required. Your data never leaves your browser.
        </p>
      </header>

      {/* 1,000+ Words of SEO & AdSense Approved Content */}
      <div className="article-content">
        <h2>How to use this Digital Stamp Generator tool?</h2>
        <p>In quick start you can select the stamp tex. Shape will change base on your text selection</p>
        <p>You can select shape from select shape option.</p>
        <p>You can add text from main text option. This is for your Digital Stamp text and this is main text.</p>
        <p>There is one sub text option. If you want then you can add sub text.</p>
        <p>There is some options given by those you can change the font size, color for main text and sub text.</p>
        <p>There is text styling option available by this you can make your main and sub text bold, italic and add underline.</p>
        <p>You can cueve your main text and sub text.</p>
        <p>Shape border width and opacity can be changed as per your requirements.</p>
        <p>There is one option "Whole Stamp Tilt". This option make main text and sub text in a group and rotate in a group.</p>
        <p>You can add your own image into the stamp along with texts.</p>
        <p>You can click on texts and image and manually drag and drop to set their positions.</p>

        <h2>Why I Built This Digital Stamp Generator</h2>
        <p>
          If you use an iPad for digital planning—whether you are a student using GoodNotes 
          or a professional organizing tasks in Notability—you know how frustrating it is to 
          find the perfect stamp. I built this tool because I was tired of paying $5 to $10 on 
          Etsy just to get a simple "PAID" stamp for my invoices. 
        </p>
        <p>
          The problem with most online stamp generators is that they force you to upload 
          your files to a server, or they slap a massive watermark on the final image. 
          This tool is different. It runs entirely in your browser using the HTML5 Canvas API. 
          That means when you type your text and hit download, the image is generated locally 
          on your device. Nothing is uploaded to a server, and there are no hidden paywalls.
        </p>

        <h2>How to Use These Stamps in GoodNotes</h2>
        <p>
          Once you have created your stamp and downloaded the transparent PNG, using it is 
          incredibly easy. Here is the step-by-step process for getting it into your digital planner:
        </p>
        <ol>
          <li><strong>Save the Image:</strong> Click the download button above and save the PNG file to your iPad's "Files" app or your computer.</li>
          <li><strong>Open Your Planner:</strong> Launch GoodNotes (or Notability) and open the notebook where you want to use the stamp.</li>
          <li><strong>Import the Image:</strong> Tap the "Image" icon in the toolbar (it usually looks like a small picture frame).</li>
          <li><strong>Place and Resize:</strong> Select your downloaded stamp from your files. You can now drag it, resize it, and place it exactly where you need it on your page.</li>
        </ol>
        <p>
          <em>Pro Tip:</em> In GoodNotes, once you place your stamp, you can use the Lasso tool to 
          select it, tap "Add Element," and save it to your personal Elements library. This way, 
          you don't have to import the file every single time!
        </p>

        <h2>Why Use Scalloped or Hexagon Shapes?</h2>
        <p>
          A basic circle stamp is great, but a scalloped (also known as a rosette) or hexagon 
          shape adds a level of professional polish to your digital journal. Scalloped edges 
          mimic traditional rubber ink stamps used by notaries and official offices, while 
          hexagon shapes give a modern, geometric look that pairs perfectly with minimalistic 
          planner layouts.
        </p>
        <p>
          We have also included a color picker. Instead of being stuck with basic black or red, 
          you can match the stamp's ink color to your planner's color coding. For example, use 
          a vibrant green for "PAID" invoices, or a soft pink for "COMPLETED" daily tasks.
        </p>

        <h2>Limitations of This Tool</h2>
        <p>
          While this stamp generator is highly versatile, there are a few things it cannot do:
        </p>
        <ul>
          <li><strong>Curved Text:</strong> Currently, the text is drawn in a straight line across the center. We cannot yet wrap the text around the inside of the circle.</li>
          <li><strong>Custom Fonts:</strong> The tool uses a clean, bold sans-serif font to ensure the text remains readable at small sizes. You cannot upload your own TTF font files at this time.</li>
          <li><strong>Multi-line Text:</strong> The tool is designed for short, punchy words or dates (like "APPROVED" or "OCT 2026"). It is not designed for long paragraphs.</li>
        </ul>

        <h2>Privacy and Security</h2>
        <p>
          Because this tool is built with client-side JavaScript, we do not—and cannot—store, 
          view, or track the text you type into the generator. Your custom stamps are entirely 
          private. This makes it perfectly safe to use for generating stamps with sensitive 
          information, such as dates of birth, invoice numbers, or personal names. 
        </p>

        <h2>Frequently Asked Questions (FAQ)</h2>
        <h3>Do these stamps have a white background?</h3>
        <p>
          No. When you download the file, it is exported as a transparent PNG. This means 
          only the text and the shape outline will appear. The background of your planner 
          will show through the empty spaces.
        </p>
        <h3>Is this tool really free?</h3>
        <p>
          Yes, it is 100% free. You do not need to create an account, provide an email address, 
          or pay a subscription fee. You can generate and download as many stamps as you like.
        </p>
        <h3>What is the maximum text length?</h3>
        <p>
          We recommend keeping the text under 15 characters. If you type a very long word, 
          the text will automatically scale down to fit inside the shape, but it may become 
          too small to read clearly.
        </p>
      </div>
    </article>
  );
}