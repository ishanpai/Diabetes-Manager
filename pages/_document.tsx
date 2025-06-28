import {
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <meta name="description" content="Diabetes Workflow Companion - Manage your diabetes patients and their data" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 