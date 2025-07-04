// 应用状态管理
const state = {
  currentApi: null,
  thirdPartyIndex: 0,
  bingPageIndex: 0,
  upx8CurrentIndex: 1,
  wallpapers: [],
  isLoading: false
};

// API配置
const API_CONFIGS = {
  official: {
    type: "official",
    baseUrl: "https://cn.bing.com",
    apiPath: "/HPImageArchive.aspx",
    params: { format: "js", idx: 0, n: 8, mkt: "zh-CN" },
    imageBaseUrl: "https://cn.bing.com",
    useProxy: true,
    proxyUrl: "https://api.allorigins.win/raw?url="
  },
  thirdparty: {
    type: "thirdparty",
    apiKey: "51138095-799c800606b8caadc071fcb56",
    baseUrl: "https://pixabay.com/api/",
    perPage: 100 // 每次请求的最大数量
  },
  upx8: {
    type: "upx8",
    baseUrl: "https://wp.upx8.com",
    apiPath: "/api.php"
  },
  imgrunRand: {
    type: "imgrun-rand",
    url: "https://bing.img.run/rand_uhd.php"
  }
};

// 工具函数
const utils = {
  formatDate(str) {
    if (!str || str.length !== 8) return '';
    return `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6)}`;
  },
  
  createErrorImage() {
    return 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22200%22 height%3D%22150%22 viewBox%3D%220 0 200 150%22%3E%3Crect fill%3D%22%23333%22 width%3D%22200%22 height%3D%22150%22%2F%3E%3Ctext fill%3D%22%23999%22 font-family%3D%22Arial%22 font-size%3D%2212%22 x%3D%22100%22 y%3D%2275%22 text-anchor%3D%22middle%22%3E图片加载失败%3C%2Ftext%3E%3C%2Fsvg%3E';
  },
  
  // 工具函数新增 fetchWithTimeout
  async fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  },
};

// 壁纸API管理
const apiManager = {
  async fetchOfficialWallpapers(count = 8) {
    const { official } = API_CONFIGS;
    const params = new URLSearchParams({
      ...official.params, 
      idx: state.bingPageIndex, 
      n: count
    });
    state.bingPageIndex += count;
    
    let url = `${official.baseUrl}${official.apiPath}?${params}`;
    if (official.useProxy) url = official.proxyUrl + encodeURIComponent(url);
    
    try {
      const res = await utils.fetchWithTimeout(url);
      const data = await res.json();
      
      return data.images.map(img => ({
        title: img.title || img.copyright || "Bing壁纸",
        date: utils.formatDate(img.enddate),
        thumb: `${official.imageBaseUrl}${img.url}`,
        full: `${official.imageBaseUrl}${img.urlbase}_UHD.jpg`
      }));
    } catch (error) {
      console.error('获取Bing壁纸失败:', error);
      return [];
    }
  },
  
  async fetchThirdPartyWallpapers(count = 8) {
    const { thirdparty } = API_CONFIGS;
    const results = [];

    try {
      const maxPage = 500;
      const randomPage = Math.floor(Math.random() * maxPage) + 1;

      // 用随机页码请求
      const response = await utils.fetchWithTimeout(
        `${thirdparty.baseUrl}?key=${thirdparty.apiKey}&per_page=${thirdparty.perPage}&page=${randomPage}`
      );
      const data = await response.json();

      if (data.hits && data.hits.length > 0) {
        // 随机选取count个壁纸
        const shuffled = data.hits.sort(() => 0.5 - Math.random());
        const itemsToAdd = shuffled.slice(0, count);

        itemsToAdd.forEach((item, index) => {
          results.push({
            title: item.tags || `Pixabay壁纸 ${(randomPage-1) * thirdparty.perPage + index + 1}`,
            date: '', // Pixabay无日期
            thumb: item.largeImageURL,
            full: item.largeImageURL
          });
        });
      }
    } catch (error) {
      console.error("获取Pixabay壁纸失败：", error);
    }

    return results;
  },
  
  fetchUpx8Wallpapers(count = 8) {
    const { upx8 } = API_CONFIGS;
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const randomParam = state.upx8CurrentIndex + i;
      
      const thumbUrl = `${upx8.baseUrl}${upx8.apiPath}/0/0?random=${randomParam}`;
      const fullUrl = `${upx8.baseUrl}${upx8.apiPath}/0/0?random=${randomParam}`; // 获取原图
      
      results.push({
        title: `超清壁纸 ${randomParam}`,
        date: '',
        thumb: thumbUrl,
        full: fullUrl
      });
    }
    
    state.upx8CurrentIndex += count;
    return results;
  },
  
  fetchImgrunRandWallpapers(count = 8) {
    const { imgrunRand } = API_CONFIGS;
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        title: "Bing随机壁纸UHD超高清原图",
        date: "",
        thumb: imgrunRand.url + "?t=" + Date.now() + "_" + Math.random(),
        full: imgrunRand.url + "?t=" + Date.now() + "_" + Math.random()
      });
    }
    return arr;
  },
  
  async fetchWallpapers(count = 8, type = null) {
    if (state.isLoading) return [];
    
    state.isLoading = true;
    
    // 如果指定了壁纸源类型，则切换
    if (type) {
      if (type === 'official') {
        state.currentApi = API_CONFIGS.official;
      } else if (type === 'thirdparty') {
        state.currentApi = API_CONFIGS.thirdparty;
      } else if (type === 'upx8') {
        state.currentApi = API_CONFIGS.upx8;
      } else if (type === 'imgrun-rand') {
        state.currentApi = API_CONFIGS.imgrunRand;
      }
    }
    
    // 如果还没有选择壁纸源，则随机选择一个
    if (!state.currentApi) {
      const sources = [API_CONFIGS.upx8, API_CONFIGS.official, API_CONFIGS.thirdparty, API_CONFIGS.imgrunRand];
      state.currentApi = sources[Math.floor(Math.random() * sources.length)];
    }
    
    let newWallpapers = [];
    try {
      if (state.currentApi === API_CONFIGS.official) {
        newWallpapers = await this.fetchOfficialWallpapers(count);
      } else if (state.currentApi === API_CONFIGS.thirdparty) {
        newWallpapers = await this.fetchThirdPartyWallpapers(count);
      } else if (state.currentApi === API_CONFIGS.upx8) {
        newWallpapers = this.fetchUpx8Wallpapers(count);
      } else if (state.currentApi === API_CONFIGS.imgrunRand) {
        newWallpapers = this.fetchImgrunRandWallpapers(count);
      }
      
      state.wallpapers = [...state.wallpapers, ...newWallpapers];
    } catch (error) {
      console.error('加载壁纸失败:', error);
    } finally {
      state.isLoading = false;
    }
    
    return newWallpapers;
  }
};

// 处理API请求
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/api/wallpapers') {
    const count = parseInt(url.searchParams.get('count') || '8');
    const type = url.searchParams.get('type');
    
    const wallpapers = await apiManager.fetchWallpapers(count, type);
    
    return new Response(
      JSON.stringify({
        success: true,
        wallpapers,
        currentApi: state.currentApi?.type
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
  
  return new Response('Not Found', { status: 404 });
}

// 处理HTTP请求
addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // 其他请求返回静态页面
  event.respondWith(fetch(request));
});    