package analyzer

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/workqueue"
	"karto/analyzer/pod"
	"karto/analyzer/traffic"
	"karto/analyzer/workload"
	"karto/types"
	"log"
	"time"
)

type AnalysisScheduler interface {
	AnalyzeOnClusterChange(k8sConfigPath string, resultsChannel chan<- types.AnalysisResult)
}

type analysisSchedulerImpl struct {
	podAnalyzer      pod.Analyzer
	trafficAnalyzer  traffic.Analyzer
	workloadAnalyzer workload.Analyzer
}

func NewAnalysisScheduler(podAnalyzer pod.Analyzer, trafficAnalyzer traffic.Analyzer, workloadAnalyzer workload.Analyzer) AnalysisScheduler {
	return analysisSchedulerImpl{
		podAnalyzer:      podAnalyzer,
		trafficAnalyzer:  trafficAnalyzer,
		workloadAnalyzer: workloadAnalyzer,
	}
}

type clusterState struct {
	Namespaces  []*corev1.Namespace
	Pods        []*corev1.Pod
	Services    []*corev1.Service
	ReplicaSets []*appsv1.ReplicaSet
	Deployments []*appsv1.Deployment
	Policies    []*networkingv1.NetworkPolicy
}

func (analysisScheduler analysisSchedulerImpl) AnalyzeOnClusterChange(k8sConfigPath string, resultsChannel chan<- types.AnalysisResult) {
	k8sClient := analysisScheduler.getK8sClient(k8sConfigPath)
	analyzeQueue := workqueue.NewRateLimitingQueue(workqueue.DefaultItemBasedRateLimiter())
	informerFactory := informers.NewSharedInformerFactory(k8sClient, 0)
	namespacesInformer := informerFactory.Core().V1().Namespaces()
	podInformer := informerFactory.Core().V1().Pods()
	servicesInformer := informerFactory.Core().V1().Services()
	replicaSetsInformer := informerFactory.Apps().V1().ReplicaSets()
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
	replicaSetsInformer.Informer().AddEventHandler(eventHandler)
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
		replicaSets, err := replicaSetsInformer.Lister().List(labels.Everything())
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
		resultsChannel <- analysisScheduler.analyze(clusterState{
			Namespaces:  namespaces,
			Pods:        pods,
			Services:    services,
			ReplicaSets: replicaSets,
			Deployments: deployments,
			Policies:    policies,
		})
		analyzeQueue.Forget(obj)
		analyzeQueue.Done(obj)
	}
}

func (analysisScheduler analysisSchedulerImpl) getK8sClient(k8sClientConfig string) *kubernetes.Clientset {
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
	k8sClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	return k8sClient
}

func (analysisScheduler analysisSchedulerImpl) analyze(clusterState clusterState) types.AnalysisResult {
	start := time.Now()
	pods := analysisScheduler.podAnalyzer.Analyze(clusterState.Pods)
	podIsolations, allowedRoutes := analysisScheduler.trafficAnalyzer.Analyze(clusterState.Pods, clusterState.Namespaces, clusterState.Policies)
	services, replicaSets, deployments := analysisScheduler.workloadAnalyzer.Analyze(clusterState.Pods, clusterState.Services, clusterState.ReplicaSets, clusterState.Deployments)
	elapsed := time.Since(start)
	log.Printf("Finished analysis in %s, found: %d pods, %d allowed routes, %d services, %d replicaSets and %d deployments\n",
		elapsed, len(pods), len(allowedRoutes), len(services), len(replicaSets), len(deployments))
	return types.AnalysisResult{
		Pods:          pods,
		PodIsolations: podIsolations,
		AllowedRoutes: allowedRoutes,
		Services:      services,
		ReplicaSets:   replicaSets,
		Deployments:   deployments,
	}
}
