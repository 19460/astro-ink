---
layout: $/layouts/post.astro
title: RabbitMQ五种工作方式
date: 2021-04-10
image: https://images.unsplash.com/photo-1501772418-b33899635bca?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1650&q=80
author: 王洪涛
authorTwitter: tmcw
category: SpringCloud
tags:
- MQ
description: There is a sweet spot of React - in moderately interactive interfaces..
---

## RabbitMQ的初始化

依赖坐标

```xml
	<!--AMQP依赖，包含RabbitMQ-->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-amqp</artifactId>
        </dependency>
        <!--单元测试-->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
        </dependency>
```

配置信息(服务者和消费者)

```yml
spring:
  rabbitmq:
    host: 192.168.150.101 # 主机名
    port: 5672 # 端口
    virtual-host: / # 虚拟主机
    username: itcast # 用户名
    password: 123321 # 密码
```



## RabbitMQ五种工作方式

![](https://s1.ax1x.com/2022/09/08/vqQD9f.png)

## 第一种、基本消息队列

Basic Queue 简单队列模型

消息发送方

```java
public class SpringAmqpTest {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Test
    public void testSimpleQueue() {
        // 队列名称
        String queueName = "simple.queue";
        // 消息
        String message = "hello, spring amqp!";
        // 发送消息
        rabbitTemplate.convertAndSend(queueName, message);
    }
}
```

消息接收方

一、首先要定义出这个队列的bean

```java
@Configuration
public class FanoutConfig {
    @Bean
    public Queue simpleQueue2(){
        return new Queue("simple.queue2");
    }
}
```

![](https://s1.ax1x.com/2022/09/08/vq1GeH.png)

二、定义该bean后就创建出这个消息队列，之后就可以监听该队列

```java
@Component
public class SpringRabbitListener {
    @RabbitListener(queues = "simple.queue2")
    public void listenSimpleQueueMessage(String msg) throws InterruptedException {
        System.out.println("消费者接收到simple.queue2的消息：【" + msg + "】");
    }
}
```

三、发送方可以向该队列发送消息

```java
	@Test
    public void testSendMessageToMq() throws InterruptedException {
        String queueName = "simple.queue2";
        String message = "Hello Spring amqp";
        for (int i=0;i<50;i++){
            rabbitTemplate.convertAndSend(queueName,message+" :"+i);
            Thread.sleep(50);
        }
    }
```

## 第二种、工作消息队列

**WorkQueue工作消息队列**

Work queues，也被称为（Task queues），任务模型。简单来说就是**让多个消费者绑定到一个队列，共同消费队列中的消息**。



一、将两个消费者绑定到同一个消息队列`simple.queue`中，其中消费者2的处理能力较弱

```java
@RabbitListener(queues = "simple.queue")
public void listenWorkQueue1(String msg) throws InterruptedException {
    System.out.println("消费者1接收到消息：【" + msg + "】" + LocalTime.now());
    Thread.sleep(20);
}

@RabbitListener(queues = "simple.queue")
public void listenWorkQueue2(String msg) throws InterruptedException {
    System.err.println("消费者2........接收到消息：【" + msg + "】" + LocalTime.now());
    Thread.sleep(200);//模拟阻塞
}
```

二、向消息队列发送请求

```java
	/**
     * workQueue
     * 向队列中不停发送消息，模拟消息堆积。
     */
@Test
public void testWorkQueue() throws InterruptedException {
    // 队列名称
    String queueName = "simple.queue";
    // 消息
    String message = "hello, message_";
    for (int i = 0; i < 50; i++) {
        // 发送消息
        rabbitTemplate.convertAndSend(queueName, message + i);
        Thread.sleep(20);
    }
}
```

三、执行后发现，消费者1执行很快，而消费者2执行很慢，但是他们处理的消息个数是相同的，因此，需要对处理消息的策略进行调整。

也就是所谓的**能者多劳**。

对配置文件进行如下修改

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        prefetch: 1 # 每次只能获取一条消息，处理完成才能获取下一个消息
```

## 发布订阅模式

![](https://s1.ax1x.com/2022/09/08/vq3I8P.png)

可以看到，在订阅模型中，多了一个exchange角色，而且过程略有变化：

- Publisher：生产者，也就是要发送消息的程序，但是不再发送到队列中，而是发给X（交换机）
- Exchange：交换机，图中的X。一方面，接收生产者发送的消息。另一方面，知道如何处理消息，例如递交给某个特别队列、递交给所有队列、或是将消息丢弃。到底如何操作，取决于Exchange的类型。Exchange有以下3种类型：
  - **Fanout**：广播，将消息交给所有绑定到交换机的队列
  - **Direct**：定向，把消息交给符合指定routing key 的队列
  - **Topic**：通配符，把消息交给符合routing pattern（路由模式） 的队列
- Consumer：消费者，与以前一样，订阅队列，没有变化
- Queue：消息队列也与以前一样，接收消息、缓存消息。

> **Exchange（交换机）只负责转发消息，不具备存储消息的能力**，因此如果没有任何队列与Exchange绑定，或者没有符合路由规则的队列，那么消息会丢失！

交换机的分类有：

![](https://s1.ax1x.com/2022/09/08/vq88IA.png)

### 第三种、发布订阅-Fanout Exchange

Fanout，英文翻译是扇出，我觉得在MQ中叫广播更合适。

![](https://s1.ax1x.com/2022/09/08/vq8pvT.png)

一、在mq配置类中定义两个队列，并将其绑定到一个交换机**Exchange**上

```java
	@Bean
    public FanoutExchange fanoutExchange() {//Fanout交换机
        return new FanoutExchange("wht.fanout");
    }	
	@Bean
    public Queue fanoutQueue1(){
        return new Queue("fanout.queue1");//第一个队列
    }
    @Bean
    public Queue fanoutQueue2(){
        return new Queue("fanout.queue2");// 第二个队列
    }
	/**
     * 绑定队列1、2到exchange
     * @param fanoutQueue1
     * @param fanoutExchange
     * @return
     */
    @Bean
    public Binding bindingQueue1(Queue fanoutQueue1,FanoutExchange fanoutExchange){
        return BindingBuilder.bind(fanoutQueue1).to(fanoutExchange);
    }

    @Bean
    public Binding bindingQueue2(Queue fanoutQueue2,FanoutExchange fanoutExchange){
        return BindingBuilder.bind(fanoutQueue2).to(fanoutExchange);
    }
```

二、消息发送

```java
@Test
public void testFanoutExchange() {
    // 队列名称
    String exchangeName = "wht.fanout";
    // 消息
    String message = "hello, everyone!";
    rabbitTemplate.convertAndSend(exchangeName, "", message);
}
```

三、消息接收

```java
@RabbitListener(queues = "fanout.queue1")
public void listenFanoutQueue1(String msg) {
    System.out.println("消费者1接收到Fanout消息：【" + msg + "】");
}

@RabbitListener(queues = "fanout.queue2")
public void listenFanoutQueue2(String msg) {
    System.out.println("消费者2接收到Fanout消息：【" + msg + "】");
}
```

两个消费者都可以接收到消息

四、总结

交换机的作用是什么？

- 接收publisher发送的消息
- 将消息按照规则路由到与之绑定的队列
- 不能缓存消息，路由失败，消息丢失
- FanoutExchange的会将消息路由到每个绑定的队列

### 第四种、发布订阅-Direct Exchange

在Fanout模式中，一条消息，会被所有订阅的队列都消费。但是，在某些场景下，我们希望不同的消息被不同的队列消费。这时就要用到Direct类型的Exchange。

Direct Exchange可以根据标签匹配不同的消费者，发送者需要在发送时指定标签，如blue、red、yellow

比如

![](https://s1.ax1x.com/2022/09/08/vq8LQK.md.png)

基于@Bean的方式声明队列和交换机比较麻烦，Spring还提供了基于注解方式来声明。

一、在consumer的SpringRabbitListener中添加两个消费者，同时基于注解来声明队列和交换机：

```java
@RabbitListener(bindings = @QueueBinding(
    value = @Queue(name = "direct.queue1"),
    exchange = @Exchange(name = "itcast.direct", type = ExchangeTypes.DIRECT),
    key = {"red", "blue"}
))
public void listenDirectQueue1(String msg){
    System.out.println("消费者接收到direct.queue1的消息：【" + msg + "】");
}

@RabbitListener(bindings = @QueueBinding(
    value = @Queue(name = "direct.queue2"),
    exchange = @Exchange(name = "itcast.direct", type = ExchangeTypes.DIRECT),
    key = {"red", "yellow"}
))
public void listenDirectQueue2(String msg){
    System.out.println("消费者接收到direct.queue2的消息：【" + msg + "】");
}
```

二、发送消息

```java
@Test
public void testSendDirectExchange() {
    // 交换机名称
    String exchangeName = "wht.direct";
    // 消息
    String message = "红色警报！日本乱排核废水，导致海洋生物变异，惊现哥斯拉！";
    // 发送消息
    rabbitTemplate.convertAndSend(exchangeName, "red", message);
}
```

由于queue1和queue2的bindingQueue都有`red`，因此，两个队列都可以接收到这条消息

### 第五种、发布订阅-Topic Exchange

`Topic`类型的`Exchange`与`Direct`相比，都是可以根据`RoutingKey`把消息路由到不同的队列。只不过`Topic`类型`Exchange`可以让队列在绑定`Routing key` 的时候使用通配符！

`Routingkey` 一般都是有一个或多个单词组成，多个单词之间以”.”分割，例如： `item.insert`

 **通配符规则**：

`#`：匹配一个或多个词

`*`：匹配不多不少恰好1个词



举例：

`item.#`：能够匹配`item.spu.insert` 或者 `item.spu`

`item.*`：只能匹配`item.spu`

![](https://s1.ax1x.com/2022/09/08/vqGZwQ.png)

一、发送消息使用时与Direct Exchange区别不大

```java
	/**
     * topicExchange
     */
@Test
public void testSendTopicExchange() {
    // 交换机名称
    String exchangeName = "itcast.topic";
    // 消息
    String message = "喜报！孙悟空大战哥斯拉，胜!";
    // 发送消息
    rabbitTemplate.convertAndSend(exchangeName, "china.news", message);
}
```

二、消息接收

```java
@RabbitListener(bindings = @QueueBinding(
    value = @Queue(name = "topic.queue1"),
    exchange = @Exchange(name = "itcast.topic", type = ExchangeTypes.TOPIC),
    key = "china.#"
))
public void listenTopicQueue1(String msg){
    System.out.println("消费者接收到topic.queue1的消息：【" + msg + "】");
}

@RabbitListener(bindings = @QueueBinding(
    value = @Queue(name = "topic.queue2"),
    exchange = @Exchange(name = "itcast.topic", type = ExchangeTypes.TOPIC),
    key = "#.news"
))
public void listenTopicQueue2(String msg){
    System.out.println("消费者接收到topic.queue2的消息：【" + msg + "】");
}
```



## JSON转换器

我们希望消息体的体积更小、可读性更高，因此可以使用JSON方式来做序列化和反序列化

一、在Publish和Consumer中引入依赖

```xml
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
    <version>2.9.10</version>
</dependency>
```

二、配置消息转换器

```java
@Bean
public MessageConverter jsonMessageConverter(){
    return new Jackson2JsonMessageConverter();
}
```

