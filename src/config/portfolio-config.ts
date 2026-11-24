export const config = {
  firstName: "SAKSHI",
  greeting: "HI, I'M",
  role: "Full-stack developer in the making",
   about: {
    boxes: [
      {
        id: "right",
        tag: "sakshi",
        blocks: [
          {
            id: "about",
            label: "01 / ABOUT",
            text: "B.Tech CSE (Data Science) student who loves building for the web. HTML, CSS and JavaScript are my base, and I'm growing into backend.",
          },
          {
            id: "now",
            label: "02 / NOW",
            text: "Learning Node.js and Express.",
          },
        ],
      },
      {
        id: "left",
        tag: "reader",
        blocks: [
          { id: "hobbies", label: "03 / HOBBIES", text: "Reading and sketching." },
          { id: "from", label: "04 / FROM", text: "Ghaziabad, India." },
        ],
      },
    ],
  },
} as const;