// 获取每日数据的脚本
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const dataDir = './src/data';

// 确保数据目录存在
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// 1. 获取天气数据 (wttr.in)
async function fetchWeather() {
  try {
    const city = 'Shanghai';
    const response = await fetch(`https://wttr.in/${city}?format=j1`);
    const data = await response.json();
    
    const current = data.current_condition[0];
    return {
      city: city,
      temp: current.temp_C,
      condition: current.weatherDesc[0].value,
      humidity: current.humidity,
      wind: current.windspeedKmph,
      updated: current.localObsDateTime
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

// 2. 获取新闻 (Hacker News Top Stories)
async function fetchNews() {
  try {
    const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids = await idsResponse.json();
    
    const top5 = ids.slice(0, 5);
    
    const news = await Promise.all(
      top5.map(async (id) => {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return await res.json();
      })
    );
    
    return news.map(item => ({
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      score: item.score,
      by: item.by,
      time: item.time
    }));
  } catch (error) {
    console.error('News fetch error:', error);
    return [];
  }
}

// 3. 获取 ClawHub 高 Star Skill (使用 GitHub API)
async function fetchTopSkills() {
  try {
    // 从 GitHub 获取 ClawHub 热门仓库
    const response = await fetch('https://api.github.com/search/repositories?q=topic:openclaw-skill+sort:stars&per_page=5', {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.items?.map(repo => ({
        name: repo.name,
        description: repo.description || '一个有用的 OpenClaw Skill',
        stars: repo.stargazers_count,
        url: repo.html_url
      })) || [];
    }
  } catch (error) {
    console.error('Skills fetch error:', error);
  }
  
  // 备用：返回默认热门 Skills
  return [
    { name: 'github', description: 'GitHub CLI 工具 - 管理 issue、PR、actions', stars: 520, url: 'https://github.com/openclaw/github' },
    { name: 'weather', description: '天气查询 - 无需 API Key', stars: 380, url: 'https://github.com/openclaw/weather' },
    { name: 'gog', description: 'Google Workspace CLI - Gmail, Calendar, Drive', stars: 320, url: 'https://github.com/openclaw/gog' }
  ];
}

// 主函数
async function main() {
  console.log('Fetching daily data...');
  
  const [weather, news, skills] = await Promise.all([
    fetchWeather(),
    fetchNews(),
    fetchTopSkills()
  ]);
  
  const data = {
    date: new Date().toISOString().split('T')[0],
    weather,
    news,
    skills
  };
  
  writeFileSync(
    `${dataDir}/daily.json`,
    JSON.stringify(data, null, 2)
  );
  
  console.log('Data fetched successfully!');
  console.log(JSON.stringify(data, null, 2));
}

main();
