import BackgroundSlider from "./BackgroundSlider";

interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}
const fetchBackgrounds = async () => {
  console.log(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.NEXT_TWITCH_CLIENT_ID}&client_secret=${process.env.NEXT_TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
  );
  const authResponse = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.NEXT_TWITCH_CLIENT_ID}&client_secret=${process.env.NEXT_TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );
  const authData: AuthResponse = await authResponse.json();
  // const gameIds = await fetchPopularGameIds(authData.access_token);
  const gameIds = [
    "28489", // Aoe4
    "2950", // Aoe2
    "299", // AoE3
    "104967", // Valheim
    "15894", // HoI4
    "250616", // Helldivers 2
    "3189", // Project Zomboid
    "11582", // Stellaris
    "28489", // Ready or Not
  ];

  const artworkUrls = await getArtworkUrls(gameIds, authData.access_token);
  return artworkUrls.sort(() => Math.random() - 0.5);
};

const getArtworkUrls = async (gameIds: string[], accessToken: string) => {
  const response = await fetch("https://api.igdb.com/v4/artworks", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": process.env.NEXT_TWITCH_CLIENT_ID as string,
      Authorization: `Bearer ${accessToken}`,
    },
    body: `fields id, game, url; sort popularity desc; limit 50; where game = (${gameIds.join(",")});`,
  });
  const body = await response.json();
  return body.map((artwork: { url: string }) =>
    artwork.url.replace("thumb", "1080p"),
  );
};

// const fetchPopularGameIds = async (accessToken: string) => {
//   const response = await fetch(
//     "https://api.igdb.com/v4/popularity_primitives",
//     {
//       method: "POST",
//       headers: {
//         Accept: "application/json",
//         "Client-ID": process.env.NEXT_TWITCH_CLIENT_ID as string,
//         Authorization: `Bearer ${accessToken}`,
//       },
//       body: "fields game_id,value,popularity_type; sort value desc; limit 10; where popularity_type = 1;",
//     },
//   );
//   const body: { game_id: string }[] = await response.json();
//   return body.map((game) => game.game_id);
// };

const Background = async () => {
  const backgrounds = await fetchBackgrounds();
  return (
    <div className=" absolute inset-0 bg-blue-950">
      <BackgroundSlider backgroundImages={backgrounds} />
    </div>
  );
};
export default Background;
