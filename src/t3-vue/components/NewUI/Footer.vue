<template>
  <a-layout-footer class="footer">
    <a-row :gutter="24">
      <a-col :xs="24" :sm="12" :md="6">
        <h4>Platform</h4>
        <ul>
          <li><a href="#">Studios</a></li>
          <li><a href="#">Models</a></li>
          <li><a href="#">Datasets</a></li>
          <li><a href="#">Documentation</a></li>
        </ul>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <h4>Community</h4>
        <ul>
          <li><a href="#">GitHub</a></li>
          <li><a href="#">Forum</a></li>
          <li><a href="#">Discord</a></li>
          <li><a href="#">Events</a></li>
        </ul>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <h4>Company</h4>
        <ul>
          <li><a href="#">About</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Careers</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <h4>Connect</h4>
        <div class="social-icons">
          <a href="#"><TwitterOutlined /></a>
          <a href="#"><GithubOutlined /></a>
          <a href="#"><LinkedinOutlined /></a>
          <a href="#"><MediumOutlined /></a>
        </div>
        <div class="newsletter">
          <p>Subscribe to our newsletter</p>
          <a-input-search
            placeholder="Your email"
            enterButton="Subscribe"
            @search="onSubscribe"
          />
        </div>
      </a-col>
    </a-row>

    <div class="footer-bottom">
      <p>&copy; 2023 AI Studio Platform. All rights reserved.</p>
      <div class="footer-links">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
      </div>
    </div>
  </a-layout-footer>
</template>

<script>
import { TwitterOutlined, GithubOutlined, LinkedinOutlined, MediumOutlined } from '@ant-design/icons-vue'

export default {
  name: 'FooterView',
  components: {
    TwitterOutlined,
    GithubOutlined,
    LinkedinOutlined,
    MediumOutlined
  },
  setup() {
    const onSubscribe = (value) => {
      console.log('Subscribed:', value)
      // Implement subscribe logic
    }

    return { onSubscribe }
  }
}
</script>

<style scoped>
.footer {
  background: #001529;
  color: rgba(255, 255, 255, 0.65);
  padding: 60px 50px 20px;
}

h4 {
  color: white;
  margin-bottom: 20px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 10px;
}

a {
  color: rgba(255, 255, 255, 0.65);
  transition: color 0.3s;
}

a:hover {
  color: #1890ff;
}

.social-icons {
  margin-bottom: 20px;
}

.social-icons a {
  font-size: 24px;
  margin-right: 16px;
}

.newsletter p {
  margin-bottom: 10px;
}

.footer-bottom {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.footer-links a {
  margin-left: 20px;
}
</style>
