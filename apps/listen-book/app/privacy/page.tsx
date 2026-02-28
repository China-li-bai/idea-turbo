import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隐私政策 | Privacy Policy | 文本转语音',
  description: '了解我们如何收集、使用和保护您的个人信息 | Learn how we collect, use, and protect your personal information',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            隐私政策
          </h1>
          <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
            Privacy Policy
          </h2>
        </div>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 text-center">
          最后更新日期：2025年1月12日 | Last Updated: January 12, 2025
        </p>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              1. 引言 | Introduction
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  欢迎使用文本转语音服务（以下简称"本服务"）。我们深知隐私对用户的重要性，因此我们承诺保护您的个人信息。本隐私政策旨在说明我们如何收集、使用、存储和保护您的个人信息。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Welcome to the Text-to-Speech service (hereinafter referred to as "the Service"). We understand the importance of privacy to our users and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your personal information.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              2. 我们收集的信息 | Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                  2.1 您主动提供的信息 | Information You Provide
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                      <li>您输入的文本内容（用于语音转换）</li>
                      <li>您选择的语音设置和偏好</li>
                      <li>您通过联系表单提供的信息</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                      <li>Text content you input (for speech conversion)</li>
                      <li>Voice settings and preferences you select</li>
                      <li>Information you provide through contact forms</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                  2.2 自动收集的信息 | Information Automatically Collected
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                      <li>设备信息（浏览器类型、操作系统、屏幕分辨率）</li>
                      <li>使用数据（访问时间、页面浏览记录）</li>
                      <li>IP 地址（用于安全和统计分析）</li>
                      <li>Cookie 和类似技术</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                      <li>Device information (browser type, operating system, screen resolution)</li>
                      <li>Usage data (access time, page views)</li>
                      <li>IP address (for security and statistical analysis)</li>
                      <li>Cookies and similar technologies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              3. 信息的使用 | How We Use Your Information
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  我们使用收集的信息用于以下目的：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>提供、维护和改进本服务</li>
                  <li>处理您的文本转语音请求</li>
                  <li>保存您的使用偏好设置</li>
                  <li>分析和改进服务性能</li>
                  <li>防止欺诈和滥用</li>
                  <li>遵守法律法规要求</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  We use the collected information for the following purposes:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>To provide, maintain, and improve the Service</li>
                  <li>To process your text-to-speech requests</li>
                  <li>To save your usage preferences</li>
                  <li>To analyze and improve service performance</li>
                  <li>To prevent fraud and abuse</li>
                  <li>To comply with legal and regulatory requirements</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              4. 信息的存储和共享 | Information Storage and Sharing
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                  4.1 信息存储 | Information Storage
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      您的文本内容主要在浏览器本地处理，我们不会将您的文本内容存储在我们的服务器上，除非您明确选择保存。您的使用偏好设置可能存储在浏览器的本地存储中。
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      Your text content is primarily processed locally in your browser. We do not store your text content on our servers unless you explicitly choose to save it. Your usage preferences may be stored in your browser's local storage.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                  4.2 信息共享 | Information Sharing
                </h3>
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                      我们不会出售、出租或交易您的个人信息。我们仅在以下情况下共享您的信息：
                    </p>
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                      <li>获得您的明确同意</li>
                      <li>为提供本服务所需的第三方服务提供商（如 TTS 服务提供商）</li>
                      <li>遵守法律法规或法院命令</li>
                      <li>保护我们的权利、财产或安全</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                      We do not sell, rent, or trade your personal information. We only share your information in the following circumstances:
                    </p>
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                      <li>With your explicit consent</li>
                      <li>With third-party service providers necessary to provide the Service (such as TTS service providers)</li>
                      <li>To comply with laws, regulations, or court orders</li>
                      <li>To protect our rights, property, or safety</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              5. Cookie 的使用 | Use of Cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们使用 Cookie 和类似技术来改善您的体验。Cookie 是存储在您设备上的小型文本文件，用于记住您的偏好设置和分析使用情况。
                </p>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-2">
                  您可以通过浏览器设置管理或删除 Cookie。请注意，禁用 Cookie 可能影响某些功能的使用。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We use cookies and similar technologies to enhance your experience. Cookies are small text files stored on your device that are used to remember your preferences and analyze usage.
                </p>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-2">
                  You can manage or delete cookies through your browser settings. Please note that disabling cookies may affect the functionality of certain features.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              6. 您的权利 | Your Rights
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  根据适用的数据保护法律，您享有以下权利：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>访问权：了解我们是否持有您的个人信息</li>
                  <li>更正权：要求更正不准确的个人信息</li>
                  <li>删除权：要求删除您的个人信息</li>
                  <li>限制处理权：限制我们处理您的个人信息</li>
                  <li>数据可携带权：以结构化格式获取您的个人信息</li>
                  <li>反对权：反对我们处理您的个人信息</li>
                </ul>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                  如需行使上述权利，请通过以下联系方式与我们联系。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  Under applicable data protection laws, you have the following rights:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>Right to access: Know if we hold your personal information</li>
                  <li>Right to rectification: Request correction of inaccurate personal information</li>
                  <li>Right to erasure: Request deletion of your personal information</li>
                  <li>Right to restrict processing: Restrict our processing of your personal information</li>
                  <li>Right to data portability: Obtain your personal information in a structured format</li>
                  <li>Right to object: Object to our processing of your personal information</li>
                </ul>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                  To exercise these rights, please contact us using the contact information below.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              7. 数据安全 | Data Security
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们采取合理的技术和组织措施来保护您的个人信息免受未经授权的访问、使用或披露。然而，请注意，通过互联网传输的任何信息都无法保证绝对安全。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We take reasonable technical and organizational measures to protect your personal information from unauthorized access, use, or disclosure. However, please note that no information transmitted over the internet can be guaranteed to be completely secure.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              8. 儿童隐私 | Children's Privacy
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  本服务不面向 13 岁以下的儿童。如果我们发现无意中收集了儿童的个人信息，我们将采取措施删除该信息。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  This Service is not directed at children under the age of 13. If we become aware that we have inadvertently collected personal information from a child, we will take steps to delete that information.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              9. 隐私政策的变更 | Changes to This Privacy Policy
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并更新"最后更新日期"。我们建议您定期查看本政策以了解我们的最新做法。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We may update this Privacy Policy from time to time. The updated policy will be posted on this page with an updated "Last Updated" date. We recommend that you review this policy regularly to stay informed about our latest practices.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              10. 联系我们 | Contact Us
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  如果您对本隐私政策有任何疑问、意见或请求，请通过以下方式联系我们：
                </p>
                <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                  <p><strong>邮箱：</strong> your-email@example.com</p>
                  <p><strong>网站：</strong> https://your-domain.com</p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  If you have any questions, comments, or requests regarding this Privacy Policy, please contact us through the following channels:
                </p>
                <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
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
