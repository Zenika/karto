package clusterlistener

import (
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/workqueue"
	"karto/types"
	"log"
)

func Listen(k8sConfigPath string, clusterStateChannel chan<- types.ClusterState) {
	k8sClient := getK8sClient(k8sConfigPath)
	analyzeQueue := workqueue.NewRateLimitingQueue(workqueue.DefaultItemBasedRateLimiter())
	informerFactory := informers.NewSharedInformerFactory(k8sClient, 0)
	namespacesInformer := informerFactory.Core().V1().Namespaces()
	podInformer := informerFactory.Core().V1().Pods()
	servicesInformer := informerFactory.Core().V1().Services()
	ingressInformer := informerFactory.Networking().V1beta1().Ingresses()
	replicaSetsInformer := informerFactory.Apps().V1().ReplicaSets()
	statefulSetsInformer := informerFactory.Apps().V1().StatefulSets()
	daemonSetsInformer := informerFactory.Apps().V1().DaemonSets()
	deploymentsInformer := informerFactory.Apps().V1().Deployments()
	policiesInformer := informerFactory.Networking().V1().NetworkPolicies()
	eventHandler := cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { analyzeQueue.Add(nil) },
		UpdateFunc: func(oldObj, newObj interface{}) { analyzeQueue.Add(nil) },
		DeleteFunc: func(obj interface{}) { analyzeQueue.Add(nil) },
	}
	namespacesInformer.Informer().AddEventHandler(eventHandler)
	podInformer.Informer().AddEventHandler(eventHandler)
	servicesInformer.Informer().AddEventHandler(eventHandler)
	ingressInformer.Informer().AddEventHandler(eventHandler)
	replicaSetsInformer.Informer().AddEventHandler(eventHandler)
	statefulSetsInformer.Informer().AddEventHandler(eventHandler)
	daemonSetsInformer.Informer().AddEventHandler(eventHandler)
	deploymentsInformer.Informer().AddEventHandler(eventHandler)
	policiesInformer.Informer().AddEventHandler(eventHandler)
	informerFactory.Start(wait.NeverStop)
	informerFactory.WaitForCacheSync(wait.NeverStop)
	for {
		obj, _ := analyzeQueue.Get()
		namespaces, err := namespacesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		pods, err := podInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		services, err := servicesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		ingresses, err := ingressInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		replicaSets, err := replicaSetsInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		statefulSets, err := statefulSetsInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		daemonSets, err := daemonSetsInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		deployments, err := deploymentsInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		policies, err := policiesInformer.Lister().List(labels.Everything())
		if err != nil {
			panic(err.Error())
		}
		clusterStateChannel <- types.ClusterState{
			Namespaces:      namespaces,
			Pods:            pods,
			Services:        services,
			Ingresses:       ingresses,
			ReplicaSets:     replicaSets,
			StatefulSets:    statefulSets,
			DaemonSets:      daemonSets,
			Deployments:     deployments,
			NetworkPolicies: policies,
		}
		analyzeQueue.Forget(obj)
		analyzeQueue.Done(obj)
	}
}

func getK8sClient(k8sClientConfig string) *kubernetes.Clientset {
	var config *rest.Config
	var err1InsideCluster, errOutsideCluster error
	config, err1InsideCluster = rest.InClusterConfig()
	if err1InsideCluster != nil {
		log.Println("Unable to connect to Kubernetes service, fallback to kubeconfig file")
		config, errOutsideCluster = clientcmd.BuildConfigFromFlags("", k8sClientConfig)
		if errOutsideCluster != nil {
			panic(errOutsideCluster.Error())
		}
	}
	k8sClient := kubernetes.NewForConfigOrDie(config)
	return k8sClient
}
