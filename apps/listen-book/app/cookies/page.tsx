import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie 政策 | Cookie Policy | 文本转语音',
  description: '了解我们如何使用 Cookie 和类似技术 | Learn how we use cookies and similar technologies',
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
          Cookie 政策 | Cookie Policy
        </h1>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
          最后更新日期：2025年1月12日 | Last Updated: January 12, 2025
        </p>

        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              1. 什么是 Cookie？ | What are Cookies?
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Cookie 是存储在您设备（计算机、手机或平板）上的小型文本文件。当您访问网站时，网站会将 Cookie 发送到您的浏览器，浏览器会将其存储起来。下次您访问同一网站时，浏览器会将 Cookie 发回网站，以便网站能够识别您并记住您的偏好设置。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Cookies are small text files stored on your device (computer, phone, or tablet). When you visit a website, the website sends cookies to your browser, which stores them. When you visit the same website again, your browser sends the cookies back to the website so it can recognize you and remember your preferences.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              2. 我们使用的 Cookie 类型 | Types of Cookies We Use
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                  2.1 必要 Cookie | Essential Cookies
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      这些 Cookie 是网站正常运行所必需的。它们使您能够浏览网站并使用其基本功能，如访问安全区域。没有这些 Cookie，网站无法正常工作。
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      These cookies are necessary for the website to function properly. They enable you to browse the website and use its basic features, such as accessing secure areas. Without these cookies, the website cannot function properly.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                  2.2 偏好 Cookie | Preference Cookies
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      这些 Cookie 使网站能够记住您所做的选择（如您的语言偏好或您所在的地区），并提供增强的、更加个性化的功能。
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      These cookies allow the website to remember choices you make (such as your language preference or the region you are in) and provide enhanced, more personalized features.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                  2.3 分析 Cookie | Analytics Cookies
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      这些 Cookie 帮助我们了解访问者如何使用我们的网站。它们收集的信息是匿名的，包括访问者数量、访问的页面以及他们如何到达网站。这些信息帮助我们改进网站的性能和用户体验。
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      These cookies help us understand how visitors use our website. They collect information anonymously, including the number of visitors, pages visited, and how they arrived at the website. This information helps us improve the website's performance and user experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              3. 我们如何使用 Cookie | How We Use Cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  我们使用 Cookie 的目的包括：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>记住您的使用偏好设置（如语音选择、播放速度等）</li>
                  <li>分析网站流量和使用模式</li>
                  <li>改进网站性能和用户体验</li>
                  <li>识别和防止安全威胁</li>
                  <li>提供个性化内容</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  We use cookies for the following purposes:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>Remember your usage preferences (such as voice selection, playback speed, etc.)</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Improve website performance and user experience</li>
                  <li>Identify and prevent security threats</li>
                  <li>Provide personalized content</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              4. 第三方 Cookie | Third-Party Cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们可能允许第三方（如 Google Analytics）在我们的网站上设置 Cookie。这些第三方 Cookie 受各自隐私政策的约束。我们建议您查看这些第三方的隐私政策以了解更多信息。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We may allow third parties (such as Google Analytics) to set cookies on our website. These third-party cookies are subject to their respective privacy policies. We recommend that you review these third parties' privacy policies for more information.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              5. Cookie 的生命周期 | Cookie Lifespan
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Cookie 分为两种类型：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2 mt-2">
                  <li><strong>会话 Cookie：</strong>这些 Cookie 在您关闭浏览器后会被删除</li>
                  <li><strong>持久 Cookie：</strong>这些 Cookie 在您关闭浏览器后仍会保留，直到它们过期或您手动删除</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Cookies come in two types:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2 mt-2">
                  <li><strong>Session Cookies:</strong> These cookies are deleted when you close your browser</li>
                  <li><strong>Persistent Cookies:</strong> These cookies remain on your device after you close your browser until they expire or you manually delete them</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              6. 如何管理 Cookie | How to Manage Cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  您可以通过浏览器设置管理或删除 Cookie。大多数浏览器允许您：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>查看存储的 Cookie</li>
                  <li>删除特定的 Cookie</li>
                  <li>阻止第三方 Cookie</li>
                  <li>阻止所有 Cookie</li>
                  <li>删除 Cookie 时清除数据</li>
                </ul>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                  请注意，禁用或删除 Cookie 可能会影响网站的功能和用户体验。某些功能可能无法正常工作。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  You can manage or delete cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>View stored cookies</li>
                  <li>Delete specific cookies</li>
                  <li>Block third-party cookies</li>
                  <li>Block all cookies</li>
                  <li>Clear data when deleting cookies</li>
                </ul>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                  Please note that disabling or deleting cookies may affect the functionality and user experience of the website. Some features may not work properly.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              7. 常见浏览器的 Cookie 设置 | Common Browser Cookie Settings
            </h2>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Chrome</h4>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    设置 &gt; 隐私和安全 &gt; Cookie 和其他网站数据
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    Settings &gt; Privacy and security &gt; Cookies and other site data
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Firefox</h4>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    选项 &gt; 隐私与安全 &gt; Cookie 和网站数据
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    Options &gt; Privacy & Security &gt; Cookies and Site Data
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Safari</h4>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    偏好设置 &gt; 隐私 &gt; 管理网站数据
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    Preferences &gt; Privacy &gt; Manage Website Data
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-zinc-800 dark:text-zinc-200">Edge</h4>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    设置 &gt; Cookie 和网站权限 &gt; Cookie 和网站数据
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300 text-sm mt-1">
                    Settings &gt; Cookies and site permissions &gt; Cookies and site data
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              8. Cookie 同意横幅 | Cookie Consent Banner
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  当您首次访问我们的网站时，我们会显示 Cookie 同意横幅。该横幅告知您我们使用 Cookie，并让您选择接受或拒绝非必要的 Cookie。您的选择将被保存，以便在将来的访问中尊重您的偏好。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  When you first visit our website, we display a cookie consent banner. This banner informs you that we use cookies and allows you to choose to accept or reject non-essential cookies. Your choice will be saved so that your preferences are respected in future visits.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              9. 更新和变更 | Updates and Changes
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们可能会不时更新本 Cookie 政策。更新后的政策将在本页面发布，并更新"最后更新日期"。我们建议您定期查看本政策以了解我们对 Cookie 的最新使用情况。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We may update this Cookie Policy from time to time. The updated policy will be posted on this page and the "Last Updated" date will be revised. We recommend that you review this policy regularly to stay informed about our latest use of cookies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              10. 更多信息 | More Information
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  如需了解更多关于 Cookie 的信息，请访问以下资源：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2 mt-2">
                  <li><a href="https://www.allaboutcookies.org" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">All About Cookies</a></li>
                  <li><a href="https://www.aboutcookies.org" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">AboutCookies.org</a></li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  For more information about cookies, please visit the following resources:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2 mt-2">
                  <li><a href="https://www.allaboutcookies.org" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">All About Cookies</a></li>
                  <li><a href="https://www.aboutcookies.org" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">AboutCookies.org</a></li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              11. 联系我们 | Contact Us
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  如果您对本 Cookie 政策有任何疑问，请通过以下方式联系我们：
                </p>
                <div className="mt-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                  <p><strong>邮箱：</strong> your-email@example.com</p>
                  <p><strong>网站：</strong> https://your-domain.com</p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  If you have any questions about this Cookie Policy, please contact us via:
                </p>
                <div className="mt-4 space-y-2 text-zinc-700 dark:text-zinc-300">
                  <p><strong>Email:</strong> your-email@example.com</p>
                  <p><strong>Website:</strong> https://your-domain.com</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
