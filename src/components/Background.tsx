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
  const response = await fetch("https://api.igdb.com/v4/artworks", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-ID": process.env.NEXT_TWITCH_CLIENT_ID as string,
      Authorization: `Bearer ${authData.access_token}`,
    },
    body: "fields alpha_channel,animated,checksum,game,height,image_id,url,width; sort date desc;",
  });
  const body = await response.json();
  return body.map((artwork: { url: string }) =>
    artwork.url.replace("thumb", "1080p"),
  );
};

const Background = async () => {
  const backgrounds = await fetchBackgrounds();
  return (
    <div className=" absolute inset-0 bg-blue-950">
      <BackgroundSlider backgroundImages={backgrounds} />
    </div>
  );
};
export default Background;
